// ============================================================
// Last Cohort — headless simulation harness
//
// Loads the real game engine into a VM sandbox and plays encounters to
// completion. Nothing here re-implements game rules: every number comes from
// combat.js actually executing. Used by balance-sim.js.
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// --- Deterministic RNG so runs are reproducible ---------------------------
function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a sandbox with the whole game loaded.
function createGame(seed = 1) {
  const rng = makeRng(seed);

  // setTimeout is used purely for pacing. Queue callbacks and drain them
  // explicitly so the whole fight runs synchronously and in order.
  const timerQueue = [];

  const ctx = {
    console,
    Math: Object.create(Math),
    JSON,
    Set, Map, Array, Object, String, Number, Boolean, Error, RegExp, Date,
    isNaN, parseInt, parseFloat, Infinity, NaN, undefined,
    setTimeout: (fn) => { timerQueue.push(fn); return timerQueue.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  };
  ctx.Math.random = rng;
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const files = [
    'data/classes.js', 'data/enemies.js', 'data/items.js',
    'data/events.js', 'data/gamedata.js',
    'js/data.js', 'js/dice.js', 'js/combat.js',
  ];
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }

  // isFastMode is defined in main.js (which needs the DOM); stub it.
  vm.runInContext('function isFastMode() { return true; }', ctx);
  vm.runInContext(`
    loadGameData();
    globalThis.__api = {
      CombatEngine, CLASS_DATA, ENEMY_DATA, ITEM_DATA, RAW_ENCOUNTERS,
      getItemData, canEquipItem, createLeveledItem, poisonTotalDamage,
      TARGET, PHASE,
      REGIONS, FINAL_MARCH, STORY_BOSS_NAMES, contentToSlotGate, generateRoute,
    };
  `, ctx);

  const api = ctx.__api;

  // window.game stub — combat.js reads difficulty, boons and curses from it.
  ctx.game = {
    difficulty: 1,
    activeBoons: [],
    activeCurses: [],
    triggerHint: () => {},
    addNotification: () => {},
  };

  return {
    ctx,
    api,
    rng,
    drainTimers(limit = 10000) {
      let n = 0;
      while (timerQueue.length > 0 && n < limit) {
        const fn = timerQueue.shift();
        try { fn(); } catch (e) { /* pacing callbacks may touch the DOM */ }
        n++;
      }
      timerQueue.length = 0;
      return n;
    },
    clearTimers() { timerQueue.length = 0; },
  };
}

// --- Player AI -----------------------------------------------------------
// Scores skills by expected value using the engine's own state. Intentionally
// generic: no per-class special-casing, so no class is favoured by the AI
// itself. Returns a score in "effective HP swung" units.
function scoreSkill(engine, api, unitIndex, skill) {
  const unit = engine.party[unitIndex];
  const fx = skill.effects || {};
  const enemies = engine.enemies.filter(e => !e.dead);
  if (enemies.length === 0) return -1;

  const allies = engine.party.filter(u => !u.downed);
  const wounded = allies.filter(u => u.hp < u.maxHp);
  const mostWounded = wounded.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

  // Rough incoming damage this unit expects, for valuing block.
  let incoming = 0;
  try {
    const f = engine.predictIncomingDamage();
    incoming = Object.values(f).reduce((s, v) => s + (v.afterBlock || 0), 0);
  } catch (e) { incoming = 0; }

  let score = 0;

  // Many skills carry a base of 0 and get their value from the die instead
  // (dieScaleDamage / dieScaleBlock / dieScaleHeal). Treating those as "no
  // effect" made the AI ignore them entirely — which silently gutted every
  // class built around them, the Medicus worst of all.
  const AVG_DIE = 3.5;
  const dieBonus = (flag) => flag ? AVG_DIE : 0;

  const bonusDmg = (unit.equipDamage || 0);
  const dmg = (fx.damage || 0) + dieBonus(fx.dieScaleDamage) +
    ((fx.damage || fx.dieScaleDamage) ? bonusDmg : 0);
  if (dmg > 0) {
    const target = enemies[0];
    score += Math.min(dmg, target.hp + (target.block || 0));
  }
  if (fx.damageAll) {
    score += enemies.reduce((s, e) => s + Math.min(fx.damageAll + bonusDmg, e.hp), 0) * 0.9;
  }
  if (fx.poison) score += api.poisonTotalDamage(fx.poison + (unit.equipPoison || 0)) * 0.8;
  if (fx.poisonAll) {
    score += enemies.length * api.poisonTotalDamage(fx.poisonAll + (unit.equipPoison || 0)) * 0.7;
  }
  if (fx.poisonSplash) score += api.poisonTotalDamage(fx.poisonSplash) * 0.6;

  const healAmt = (fx.heal || 0) + dieBonus(fx.dieScaleHeal) +
    ((fx.heal || fx.dieScaleHeal) ? (unit.equipHeal || 0) : 0);
  if (healAmt > 0 && mostWounded) {
    score += Math.min(healAmt, mostWounded.maxHp - mostWounded.hp) * 1.1;
  }
  if (fx.healAll) {
    score += allies.reduce((s, u) => s + Math.min(fx.healAll, u.maxHp - u.hp), 0);
  }
  const blockAmt = (fx.block || 0) + dieBonus(fx.dieScaleBlock) +
    ((fx.block || fx.dieScaleBlock) ? (unit.equipBlock || 0) : 0);
  if (blockAmt > 0) score += Math.min(blockAmt, Math.max(2, incoming)) * 0.9;
  if (fx.blockAll) score += Math.min(fx.blockAll * allies.length, Math.max(3, incoming)) * 0.9;

  // Morale drives the damage/healing bands, so morale swings are real value.
  // 30 skills carry a morale effect; ignoring them made whole kits invisible.
  if (fx.morale) score += fx.morale * 0.9;
  if (fx.moraleHealAll) score += 4;

  // Damage multipliers on top of a base the AI already counted.
  if (fx.bonusDmgScale && dmg > 0) score += dmg * (fx.bonusDmgScale - 1);
  if (fx.halfBonusDmg && dmg > 0) score -= dmg * 0.25;
  if (fx.bonusHealScale && healAmt > 0) score += healAmt * (fx.bonusHealScale - 1);
  if (fx.blockScale && blockAmt > 0) score += blockAmt * (fx.blockScale - 1);

  if (fx.pierceBlock) score += enemies.reduce((s, e) => s + Math.min(4, e.block || 0), 0);
  if (fx.pierceRow) score += 4;
  if (fx.splashAdjacentPct) score += (dmg || 4) * fx.splashAdjacentPct;
  if (fx.freeAction) score += 8;          // an extra action is worth roughly a skill
  if (fx.bonusDiceNext) score += fx.bonusDiceNext * 4;
  if (fx.healSelf) score += Math.min(fx.healSelf, unit.maxHp - unit.hp);
  if (fx.blockOthersOnly) score += Math.min(fx.blockOthersOnly * (allies.length - 1), Math.max(3, incoming)) * 0.9;
  if (fx.cleanseAll) score += allies.filter(u => u.poison > 0).length * 3;
  if (fx.damageShield) score += 5;
  if (fx.intercept) score += 5;
  if (fx.condemn) score += 5;
  if (fx.cripple) score += 4;
  if (fx.knockback) score += 2;
  if (fx.smokeScreen) score += 3;
  if (fx.counterStance) score += 3;
  if (fx.buffSelf) score += 3;
  if (fx.shieldBrace) score += 4;
  if (fx.gladiusThrust) score += 4;
  if (fx.scoutingManeuver) score += 2;

  // Utility, valued modestly so it is used but does not dominate.
  if (fx.stun) score += 6;
  if (fx.revive) score += 20;
  if (fx.taunt) score += 3;
  if (fx.buffAllies) score += 4;
  if (fx.markTarget) score += 2;
  if (fx.cleanse) score += wounded.length > 0 ? 2 : 0;
  if (fx.stimulant) score += 5;
  if (fx.execute) score += 4;
  if (fx.fortifiedStrike) score += (unit.block || 0) + 2;
  if (fx.precisionDrill) score += 5;
  if (fx.calculatedDosage) score += 6;
  if (fx.triageStrike) score += 6;

  // Self-damage is a real cost.
  if (fx.selfDamage) score -= fx.selfDamage * 1.2;
  if (fx.transfusion) score -= 3;
  if (fx.moraleCost) score -= fx.moraleCost * 0.2;

  // Cheap skills are worth slightly more (dice are the scarce resource).
  const diceCost = skill.cost && skill.cost.dice ? skill.cost.dice : 1;
  return score / diceCost;
}

// Play one player turn: keep acting while any unit can.
function playPlayerTurn(engine, api, stats) {
  let guard = 0;
  while (guard++ < 40) {
    let best = null;
    for (let i = 0; i < engine.party.length; i++) {
      const unit = engine.party[i];
      if (unit.downed || unit.actedThisTurn) continue;
      const skills = engine.getValidSkills(i);
      for (const skill of skills) {
        if (!skill.canUse) continue;
        const dice = engine.autoPick(skill);
        if (!dice || dice.length === 0) continue;
        // Count every affordable option, so a skill that is constantly
        // available but never worth picking is distinguishable from one that
        // was simply never learned.
        if (stats) {
          const key = `${unit.classId}:${skill.id}`;
          const rec = stats.skills[key] || {
            classId: unit.classId, skillId: skill.id, name: skill.name, uses: 0, offers: 0,
          };
          rec.offers++;
          stats.skills[key] = rec;
        }
        const score = scoreSkill(engine, api, i, skill);
        if (!best || score > best.score) best = { unitIndex: i, skill, dice, score };
      }
    }
    if (!best || best.score <= 0) break;

    // Choose targets the way the UI would.
    const unit = engine.party[best.unitIndex];
    const skill = best.skill;
    let targets = [];
    const t = skill.target;
    if (t === api.TARGET.SINGLE_ENEMY || t === api.TARGET.DUAL_ENEMY || t === api.TARGET.RANDOM_ENEMY) {
      const valid = engine.getValidEnemyTargets(skill, unit);
      if (valid.length === 0) break;
      // Focus the lowest effective HP target — standard play.
      targets = [valid.reduce((lo, e) =>
        (e.hp + (e.block || 0)) < (lo.hp + (lo.block || 0)) ? e : lo, valid[0])];
    } else if (t === api.TARGET.SINGLE_ALLY) {
      const pool = engine.party.filter(u => (skill.effects && skill.effects.revive) ? u.downed : !u.downed);
      if (pool.length === 0) break;
      targets = [pool.reduce((lo, u) => (u.hp / u.maxHp) < (lo.hp / lo.maxHp) ? u : lo, pool[0])];
    } else if (t === api.TARGET.SELF) {
      targets = [unit];
    } else {
      targets = [];
    }

    const before = { hp: engine.party.map(u => u.hp) };
    engine.executeSkill(best.unitIndex, skill.id, best.dice, targets);

    if (stats) {
      const key = `${unit.classId}:${skill.id}`;
      const rec = stats.skills[key] || {
        classId: unit.classId, skillId: skill.id, name: skill.name, uses: 0, offers: 0,
      };
      rec.uses++;
      stats.skills[key] = rec;
    }
    void before;
  }
}

// Run a single encounter to completion. Returns 'victory' | 'defeat' | 'timeout'.
function runEncounter(game, engine, encounterDef, { maxTurns = 60, stats = null } = {}) {
  const { api } = game;
  engine.initEncounter(encounterDef);
  // The UI normally kicks off spawning; it chains one enemy per timer tick.
  engine.beginSpawning();
  game.drainTimers();

  let turns = 0;
  while (turns < maxTurns) {
    if (engine.phase === api.PHASE.VICTORY) return { result: 'victory', turns };
    if (engine.phase === api.PHASE.DEFEAT) return { result: 'defeat', turns };

    engine.startRollPhase();
    game.drainTimers();
    if (engine.phase === api.PHASE.VICTORY) return { result: 'victory', turns };
    if (engine.phase === api.PHASE.DEFEAT) return { result: 'defeat', turns };

    // The UI drives dice reveal; headless we go straight through.
    if (engine.phase === api.PHASE.ROLLING) {
      engine.onDiceRevealed();
      game.drainTimers();
    }

    if (engine.phase === api.PHASE.PLAYER_TURN) {
      playPlayerTurn(engine, api, stats);
      game.drainTimers();
    }

    if (engine.phase === api.PHASE.VICTORY) return { result: 'victory', turns };
    if (engine.phase === api.PHASE.DEFEAT) return { result: 'defeat', turns };

    if (engine.phase === api.PHASE.PLAYER_TURN) {
      engine.endPlayerTurn();
      game.drainTimers();
    }
    turns++;
  }
  return { result: 'timeout', turns };
}

module.exports = { createGame, runEncounter, playPlayerTurn, scoreSkill, makeRng };
