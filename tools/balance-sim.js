// ============================================================
// Last Cohort — balance simulation
//
// Plays real encounters through the real engine and reports where power sits.
// Nothing here models the rules; combat.js executes them.
//
//   node tools/balance-sim.js            # full report
//   node tools/balance-sim.js --fast     # fewer samples
//   node tools/balance-sim.js --section classes
// ============================================================

const { createGame, runEncounter } = require('./sim-harness.js');

const argv = process.argv.slice(2);
const FAST = argv.includes('--fast');
const ONLY = (() => {
  const i = argv.indexOf('--section');
  return i >= 0 ? argv[i + 1] : null;
})();

const N = FAST ? 40 : 160;          // samples per cell
// Runs are FINAL_MARCH (6) slots long. The slot drives scaling; the REGION
// drives content (see REGIONS in js/data.js). These are the march slots.
const DIFFICULTIES = FAST ? [1, 3, 5] : [1, 2, 3, 4, 5, 6];

// Which regions can occupy each slot — mirrors generateRoute() in js/data.js.
const REGIONS_BY_SLOT = {
  1: ['ambush_trail'],
  2: ['hunting_grounds', 'poisoned_bog'],
  3: ['old_forest', 'blood_grove', 'drowned_vale'],
  4: ['old_forest', 'blood_grove', 'drowned_vale'],
  5: ['haunted_march', 'heart_forest'],
  6: ['threshold'],
};

// --- Party construction --------------------------------------------------
// Mirrors the in-game test scaler: learn skills, grow HP, equip leveled gear
// appropriate to the march, so classes are compared at realistic power.
// Deliberately mirrors startTestRun() in js/main.js — the project's own answer
// to "what does a party look like at slot N" (per-march growth at 8/6 of the
// old 8-march rates, so slot 6 matches the old march-8 party).
function buildParty(g, engine, classIds, difficulty, rng, { allSkills = false } = {}) {
  const diff = difficulty;
  engine.difficulty = diff;
  g.ctx.game.difficulty = diff;
  engine.initParty(classIds);

  const CLASS_DATA = g.api.CLASS_DATA;
  const ITEM_DATA = g.api.ITEM_DATA;
  const skillCount = allSkills ? 99 : 5;
  const itemLevel = Math.max(0, Math.floor(diff * 0.45));
  const hpBonus = Math.floor(diff * 3.2);
  let epicBudget = diff >= 5 ? 1 : 0;

  engine.party.forEach(u => {
    const starters = u.allSkills.filter(s => s.starter);
    const nonStarters = u.allSkills.filter(s => !s.starter).slice();
    for (let i = nonStarters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [nonStarters[i], nonStarters[j]] = [nonStarters[j], nonStarters[i]];
    }
    const toLearn = [...starters, ...nonStarters.slice(0, Math.max(0, skillCount - starters.length))];
    u.skills = toLearn.map(s => ({ ...s }));

    const tags = CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].tags : [];
    const isSquishy = tags.includes('support') || tags.includes('ranged');
    const extraHp = Math.max(0, hpBonus + Math.floor(u.maxHp * 0.35) - (isSquishy ? 10 : 5));
    u.maxHp += extraHp;
    u.baseMaxHp += extraHp;
    u.hp = u.maxHp;

    const isMelee = tags.includes('melee');
    const isRanged = tags.includes('ranged');
    const isSupport = tags.includes('support');
    const isCommand = tags.includes('command');
    const isElite = tags.includes('elite');
    u.bonusDamage = Math.floor(diff * ((isMelee || isElite) ? 3.2 : isRanged ? 2.6 : 1.4));
    u.bonusBlock = Math.floor(diff * ((isCommand || isElite) ? 1.8 : isMelee ? 1.5 : 0.8));
    u.bonusHeal = Math.floor(diff * (isSupport ? 2.4 : 0.6));
    u.bonusPoison = Math.floor(diff * (isRanged ? 0.8 : isSupport ? 0.55 : 0));

    // Fill every slot, matching the in-game scaler.
    const rarities = diff >= 5 ? ['uncommon', 'rare'] : diff >= 3 ? ['common', 'uncommon'] : ['common'];
    const fillChance = Math.min(1, 0.5 + diff * 0.09);
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (let si = 0; si < u.equipment[slot].length; si++) {
        if (rng() > fillChance) continue;
        const useEpic = epicBudget > 0 && rng() < 0.3;
        const slotRarities = useEpic ? ['epic'] : rarities;
        const eligible = Object.values(ITEM_DATA).filter(item => {
          if (item.slot !== slot) return false;
          if (item.baseId) return false;
          if (item.minDifficulty && item.minDifficulty > diff) return false;
          if (!slotRarities.includes(item.rarity)) return false;
          return g.api.canEquipItem(u, item);
        });
        if (eligible.length === 0) continue;
        const pick = eligible[Math.floor(rng() * eligible.length)];
        if (useEpic && pick.rarity === 'epic') epicBudget--;
        u.equipment[slot][si] = itemLevel > 0
          ? g.api.createLeveledItem(pick.id, itemLevel)
          : pick.id;
      }
    }
    engine.computeEquipmentStats(u);
    u.hp = u.maxHp;
  });
  engine.morale = 50;
}

// Encounters the real game can serve at this slot — mirrors map.js/data.js.
// kind 'boss': slots 1-5 draw the regular pool (story bosses excluded, gates
// translated to slots); slot 6 is the story rotation (all three, i.e. a
// fully-unlocked player). kind 'normal': the region's pool — curated list if
// it has one, otherwise the threat tiers at the region's contentDiff (threat
// is 3 from slot 3 on, 2-3 at slot 2, 1-3 at slot 1).
function encountersFor(g, slot, kind, regionId = null) {
  const R = g.api.RAW_ENCOUNTERS;
  const REGIONS = g.api.REGIONS;
  if (kind === 'boss') {
    if (slot >= g.api.FINAL_MARCH) {
      return R.bossEncounters.filter(b => g.api.STORY_BOSS_NAMES.includes(b.name));
    }
    return R.bossEncounters.filter(b => {
      if (g.api.STORY_BOSS_NAMES.includes(b.name)) return false;
      const gate = b.minDifficulty ? g.api.contentToSlotGate(b.minDifficulty) : 1;
      return gate <= slot;
    });
  }
  const region = REGIONS[regionId || REGIONS_BY_SLOT[slot][0]];
  const T = R.threatLevels;
  if (region.pool) {
    const all = [...T.easy, ...T.mid, ...T.hard];
    return region.pool.map(n => all.find(e => e.name === n)).filter(Boolean);
  }
  const cd = region.contentDiff;
  const fits = e => (!e.minDifficulty || e.minDifficulty <= cd) &&
                    (!e.maxDifficulty || e.maxDifficulty >= cd);
  if (slot <= 1) return [...T.easy, ...T.mid, ...T.hard].filter(fits);
  if (slot === 2) return [...T.mid, ...T.hard].filter(fits);
  return T.hard.filter(fits);
}

// A random region legal at this slot.
function regionForSlot(slot, rng) {
  const options = REGIONS_BY_SLOT[slot] || REGIONS_BY_SLOT[6];
  return options[Math.floor(rng() * options.length)];
}

// --- One sample ----------------------------------------------------------
function sample(seed, classIds, difficulty, encounter, collect, opts = {}) {
  const g = createGame(seed);
  const engine = new g.api.CombatEngine();
  const rng = g.rng;
  buildParty(g, engine, classIds, difficulty, rng, opts);

  const hpBefore = engine.party.map(u => u.hp);
  const res = runEncounter(g, engine, encounter, { maxTurns: 40, stats: collect });

  const hpAfter = engine.party.map(u => u.hp);
  const perUnit = engine.party.map((u, i) => ({
    classId: u.classId,
    damage: u.stats.damageDealt || 0,
    healing: u.stats.healingDone || 0,
    block: u.stats.blockGenerated || 0,
    taken: u.stats.damageTaken || 0,
    hpLostPct: (hpBefore[i] - hpAfter[i]) / Math.max(1, u.maxHp),
    downed: !!u.downed,
  }));
  return { result: res.result, turns: res.turns, perUnit };
}

// Play a whole march: `combats` fights, a rest two-thirds through, then a boss.
// Single encounters saturate near 97% win for a properly scaled party, so they
// cannot separate classes. Attrition across a march is where power actually
// shows, because HP and cooldowns carry over.
function runMarch(seed, classIds, difficulty, { combats = null, collect = null, forceItem = null, region = null } = {}) {
  const g = createGame(seed);
  const engine = new g.api.CombatEngine();
  buildParty(g, engine, classIds, difficulty, g.rng);
  // The final march map is shorter (maxMidDepth 4): ~4 fights before the boss.
  if (combats === null) combats = difficulty >= g.api.FINAL_MARCH ? 4 : 6;
  const regionId = region || regionForSlot(difficulty, g.rng);

  if (forceItem) {
    const it = g.api.ITEM_DATA[forceItem];
    if (it) {
      engine.party.forEach(u => {
        if (g.api.canEquipItem(u, it)) engine.equipItem(u.index, forceItem);
        engine.computeEquipmentStats(u);
        u.hp = u.maxHp;
      });
    }
  }

  const normalPool = encountersFor(g, difficulty, 'normal', regionId);
  const bossPool = encountersFor(g, difficulty, 'boss');
  if (!normalPool.length || !bossPool.length) return null;

  const startHp = engine.party.reduce((s, u) => s + u.maxHp, 0);
  let fights = 0, turns = 0, downs = 0;

  for (let c = 0; c < combats; c++) {
    const enc = normalPool[Math.floor(g.rng() * normalPool.length)];
    const res = runEncounter(g, engine, enc, { maxTurns: 40, stats: collect });
    fights++; turns += res.turns;
    downs += engine.party.filter(u => u.downed).length;
    if (res.result !== 'victory') {
      return { completed: false, diedAt: fights, fights, turns, downs, engine, startHp };
    }
    // Between fights the real game runs afterEncounter(): revive, post-combat
    // heal, and status clears. The sim previously modelled only a 50% revive,
    // which understated march completion.
    engine.afterEncounter();
    if (c === Math.floor(combats * 0.66)) {
      engine.party.forEach(u => { u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * 0.15)); });
    }
  }

  const boss = bossPool[Math.floor(g.rng() * bossPool.length)];
  const bres = runEncounter(g, engine, boss, { maxTurns: 40, stats: collect });
  fights++; turns += bres.turns;
  downs += engine.party.filter(u => u.downed).length;
  return {
    completed: bres.result === 'victory',
    diedAt: bres.result === 'victory' ? null : fights,
    fights, turns, downs, engine, startHp,
  };
}

function pct(n, d) { return d === 0 ? '—' : ((n / d) * 100).toFixed(1) + '%'; }
function bar(v, max, width = 22) {
  const n = max === 0 ? 0 : Math.round((v / max) * width);
  return '█'.repeat(Math.max(0, n)).padEnd(width, '·');
}
function heading(t) {
  console.log('\n' + '='.repeat(74));
  console.log(t);
  console.log('='.repeat(74));
}

const CLASSES = (() => {
  const g = createGame(1);
  return Object.keys(g.api.CLASS_DATA);
})();

// Classes that exist but need unlocking still get simulated — the question is
// how strong they are, not whether they're available.
function randomParty(rng, pool = CLASSES) {
  const c = pool.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, 3);
}

// ============================================================
// 1. Class strength
// ============================================================
function reportClasses() {
  heading('1. CLASS STRENGTH  (full marches — 6 fights then a boss)');
  const stats = {};
  CLASSES.forEach(c => {
    stats[c] = { marches: 0, completed: 0, dmg: 0, poison: 0, heal: 0, block: 0, downs: 0, share: 0, fights: 0 };
  });

  let seed = 1000;
  const rngSel = createGame(7).rng;
  const diffs = FAST ? [2, 5] : [2, 4, 5, 6];
  const per = FAST ? 40 : 150;

  for (const diff of diffs) {
    for (let i = 0; i < per; i++) {
      const party = randomParty(rngSel);
      const m = runMarch(seed++, party, diff);
      if (!m) continue;
      const units = m.engine.party;
      // Poison damage is tracked separately from direct damage; omitting it
      // made poison-leaning classes look like they contributed nothing.
      const tot = (u, k) => (u.runStats[k] || 0) + (u.stats[k] || 0);
      const contribution = u =>
        tot(u, 'damageDealt') + tot(u, 'poisonDamageDealt') +
        tot(u, 'healingDone') + tot(u, 'blockGenerated');
      const total = units.reduce((s, u) => s + contribution(u), 0) || 1;
      units.forEach(u => {
        const s = stats[u.classId];
        s.marches++;
        if (m.completed) s.completed++;
        s.fights += m.fights;
        s.dmg += tot(u, 'damageDealt');
        s.poison += tot(u, 'poisonDamageDealt');
        s.heal += tot(u, 'healingDone');
        s.block += tot(u, 'blockGenerated');
        if (u.downed) s.downs++;
        s.share += contribution(u) / total;
      });
    }
  }

  const rows = CLASSES.map(c => {
    const s = stats[c];
    return {
      c,
      marches: s.marches,
      win: s.marches ? s.completed / s.marches : 0,
      dmg: s.fights ? s.dmg / s.fights : 0,
      poison: s.fights ? s.poison / s.fights : 0,
      heal: s.fights ? s.heal / s.fights : 0,
      block: s.fights ? s.block / s.fights : 0,
      downRate: s.marches ? s.downs / s.marches : 0,
      share: s.marches ? s.share / s.marches : 0,
    };
  }).sort((a, b) => b.win - a.win);

  console.log('\nmarch completion rate when this class is on the team.');
  console.log('contribution = share of the team\'s damage + poison + healing + block.\n');
  console.log('class         marches  march%   contribution    dmg  poison  heal  block  down%');
  console.log('-'.repeat(79));
  const maxShare = Math.max(...rows.map(x => x.share));
  rows.forEach(r => {
    console.log(
      r.c.padEnd(14) +
      String(r.marches).padStart(6) +
      (r.win * 100).toFixed(1).padStart(8) +
      '   ' + bar(r.share, maxShare, 12) +
      r.dmg.toFixed(0).padStart(6) +
      r.poison.toFixed(0).padStart(7) +
      r.heal.toFixed(0).padStart(6) +
      r.block.toFixed(0).padStart(7) +
      (r.downRate * 100).toFixed(0).padStart(6)
    );
  });

  const best = rows[0], worst = rows[rows.length - 1];
  console.log(`\nspread: ${best.c} ${(best.win * 100).toFixed(1)}%  →  ${worst.c} ${(worst.win * 100).toFixed(1)}%` +
    `  (${((best.win - worst.win) * 100).toFixed(1)} points)`);
  return rows;
}

// ============================================================
// 2. Party combinations
// ============================================================
function reportCombos() {
  heading('2. PARTY COMBINATIONS  (every 3-class team)');
  const combos = [];
  for (let a = 0; a < CLASSES.length; a++)
    for (let b = a + 1; b < CLASSES.length; b++)
      for (let c = b + 1; c < CLASSES.length; c++)
        combos.push([CLASSES[a], CLASSES[b], CLASSES[c]]);

  const per = FAST ? 2 : 6;
  const diffs = FAST ? [4] : [3, 5];
  let seed = 50000;

  const results = combos.map(team => {
    let wins = 0, runs = 0, turns = 0;
    for (const diff of diffs) {
      for (let i = 0; i < per; i++) {
        const m = runMarch(seed++, team, diff);
        if (!m) continue;
        runs++; turns += m.turns;
        if (m.completed) wins++;
      }
    }
    return { team, fights: runs, win: runs ? wins / runs : 0, turns: runs ? turns / runs : 0 };
  }).filter(r => r.fights > 0).sort((a, b) => b.win - a.win);

  console.log(`\n${combos.length} combinations, ${per * diffs.length} full marches each\n`);
  console.log('STRONGEST');
  results.slice(0, 10).forEach(r =>
    console.log('  ' + r.team.join(' + ').padEnd(46) + (r.win * 100).toFixed(0).padStart(4) + '%   ' +
      r.turns.toFixed(1) + ' turns'));
  console.log('\nWEAKEST');
  results.slice(-10).reverse().forEach(r =>
    console.log('  ' + r.team.join(' + ').padEnd(46) + (r.win * 100).toFixed(0).padStart(4) + '%   ' +
      r.turns.toFixed(1) + ' turns'));

  // Which classes appear disproportionately in the top/bottom decile?
  const decile = Math.max(1, Math.floor(results.length / 10));
  const top = {}, bot = {};
  results.slice(0, decile).forEach(r => r.team.forEach(c => top[c] = (top[c] || 0) + 1));
  results.slice(-decile).forEach(r => r.team.forEach(c => bot[c] = (bot[c] || 0) + 1));
  console.log('\nappearances in the strongest 10% of teams:');
  Object.entries(top).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
    console.log('  ' + c.padEnd(16) + n));
  console.log('\nappearances in the weakest 10% of teams:');
  Object.entries(bot).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
    console.log('  ' + c.padEnd(16) + n));
  return results;
}

// ============================================================
// 3. Encounter and boss difficulty
// ============================================================
function reportEncounters() {
  heading('3. ENEMIES & BOSSES  (win rate against a scaled party)');
  const rngSel = createGame(13).rng;
  let seed = 90000;
  const rows = [];

  for (const kind of ['boss', 'normal']) {
    for (const diff of DIFFICULTIES) {
      const regions = kind === 'boss' ? [null] : REGIONS_BY_SLOT[diff];
      for (const regionId of regions) {
        const pool = encountersFor(createGame(1), diff, kind, regionId);
        for (const enc of pool) {
          let wins = 0, fights = 0, turns = 0, timeouts = 0;
          const reps = kind === 'boss' ? (FAST ? 8 : 40) : (FAST ? 4 : 25);
          for (let i = 0; i < reps; i++) {
            const team = randomParty(rngSel);
            const r = sample(seed++, team, diff, enc);
            if (r.result === 'timeout') { timeouts++; continue; }
            fights++; turns += r.turns;
            if (r.result === 'victory') wins++;
          }
          if (fights === 0) continue;
          rows.push({
            kind, diff, region: regionId, name: enc.name,
            win: wins / fights, turns: turns / fights, fights, timeouts,
          });
        }
      }
    }
  }

  const bosses = rows.filter(r => r.kind === 'boss').sort((a, b) => a.win - b.win);
  console.log('\nBOSSES (hardest first)');
  console.log('march  boss                              win%   turns');
  console.log('-'.repeat(66));
  bosses.forEach(r => console.log(
    String(r.diff).padStart(4) + '   ' + r.name.padEnd(32) +
    (r.win * 100).toFixed(0).padStart(5) + '   ' + r.turns.toFixed(1).padStart(6)));

  // Flag bosses that are out of line with their march's average.
  const byDiff = {};
  bosses.forEach(r => { (byDiff[r.diff] = byDiff[r.diff] || []).push(r); });
  console.log('\nOUT OF LINE WITH THEIR MARCH (>20 points from the march average)');
  let flagged = 0;
  for (const [diff, list] of Object.entries(byDiff)) {
    const avg = list.reduce((s, r) => s + r.win, 0) / list.length;
    list.forEach(r => {
      const delta = (r.win - avg) * 100;
      if (Math.abs(delta) > 20) {
        flagged++;
        console.log(`  march ${diff}  ${r.name.padEnd(30)} ${(r.win * 100).toFixed(0).padStart(4)}%  ` +
          `(march avg ${(avg * 100).toFixed(0)}%, ${delta > 0 ? '+' : ''}${delta.toFixed(0)} → ${delta > 0 ? 'TOO EASY' : 'TOO HARD'})`);
      }
    });
  }
  if (flagged === 0) console.log('  (none)');

  const norm = rows.filter(r => r.kind === 'normal').sort((a, b) => a.win - b.win);
  const regTag = r => (r.region || '').replace(/_/g, ' ').padEnd(16);
  console.log('\nHARDEST NORMAL ENCOUNTERS');
  norm.slice(0, 14).forEach(r => console.log(
    `  slot ${r.diff}  ${regTag(r)} ${r.name.padEnd(28)} ${(r.win * 100).toFixed(0).padStart(4)}%  ${r.turns.toFixed(1)} turns`));
  console.log('\nEASIEST NORMAL ENCOUNTERS');
  norm.slice(-10).reverse().forEach(r => console.log(
    `  slot ${r.diff}  ${regTag(r)} ${r.name.padEnd(28)} ${(r.win * 100).toFixed(0).padStart(4)}%  ${r.turns.toFixed(1)} turns`));

  console.log('\nDIFFICULTY CURVE BY MARCH');
  for (const diff of DIFFICULTIES) {
    const list = rows.filter(r => r.kind === 'normal' && r.diff === diff);
    if (!list.length) continue;
    const avg = list.reduce((s, r) => s + r.win, 0) / list.length;
    console.log(`  march ${String(diff).padStart(2)}  ${bar(avg, 1, 30)} ${(avg * 100).toFixed(0)}%`);
  }
  return rows;
}

// ============================================================
// 4. Skill usage
// ============================================================
function reportSkills() {
  heading('4. SKILL USAGE  (how often each skill is actually the best play)');
  const collect = { skills: {} };
  const rngSel = createGame(17).rng;
  let seed = 200000;
  let fights = 0;

  // Give every unit its full kit, otherwise "never chosen" would really mean
  // "never learned" — buildParty normally teaches only a handful of skills.
  for (const diff of DIFFICULTIES) {
    const pool = REGIONS_BY_SLOT[diff].flatMap(r => encountersFor(createGame(1), diff, 'normal', r));
    for (let i = 0; i < (FAST ? 30 : 90); i++) {
      const team = randomParty(rngSel);
      const enc = pool[Math.floor(rngSel() * pool.length)];
      sample(seed++, team, diff, enc, collect, { allSkills: true });
      fights++;
    }
  }

  const byClass = {};
  Object.values(collect.skills).forEach(r => {
    (byClass[r.classId] = byClass[r.classId] || []).push(r);
  });

  console.log(`\n${fights} fights, every unit holding its full kit.`);
  console.log('pick% = how often the skill was chosen when it was affordable.');
  console.log('A skill offered constantly but rarely picked is losing to its own alternatives.\n');

  const g = createGame(1);

  // The AI can only value effects it models. A skill built entirely on effects
  // it does not understand will never be picked — that says nothing about the
  // skill. Separate those out rather than reporting them as weak.
  const scoredKeys = new Set(
    [...require('fs').readFileSync(require('path').join(__dirname, 'sim-harness.js'), 'utf8')
      .matchAll(/fx\.([a-zA-Z]+)/g)].map(m => m[1])
  );
  const isEvaluable = (skill) => {
    const keys = Object.keys(skill.effects || {});
    return keys.some(k => scoredKeys.has(k));
  };

  const deadWeight = [];
  const notEvaluated = [];
  for (const classId of Object.keys(byClass).sort()) {
    const used = byClass[classId];
    const all = g.api.CLASS_DATA[classId].skills;
    const byId = Object.fromEntries(all.map(s => [s.id, s]));
    console.log(classId.toUpperCase());
    used.sort((a, b) => (b.uses / Math.max(1, b.offers)) - (a.uses / Math.max(1, a.offers)));
    used.slice(0, 5).forEach(r => console.log(
      '   ' + r.name.padEnd(26) + bar(r.uses / Math.max(1, r.offers), 1, 16) +
      ' ' + pct(r.uses, r.offers).padStart(6) + `  (offered ${r.offers}x)`));

    used.filter(r => r.offers >= 100 && r.uses / r.offers < 0.02).forEach(r => {
      const def = byId[r.skillId];
      const line = `${classId}/${r.name} (offered ${r.offers}x, picked ${r.uses}x)`;
      if (def && isEvaluable(def)) deadWeight.push(line);
      else notEvaluated.push(`${classId}/${r.name}`);
    });

    const seen = new Set(used.map(r => r.skillId));
    const neverOffered = all.filter(s => !seen.has(s.id));
    if (neverOffered.length) {
      console.log('   never affordable: ' + neverOffered.map(s => s.name).join(', '));
    }
    console.log();
  }

  if (deadWeight.length) {
    console.log('LOSES TO ITS OWN ALTERNATIVES');
    console.log('(the sim understands these effects and still almost never picks them)');
    deadWeight.forEach(d => console.log('   ' + d));
  }
  if (notEvaluated.length) {
    console.log('\nNOT EVALUATED BY THE SIM — no conclusion either way');
    console.log('(built on effects the sim AI does not model; needs human judgement)');
    console.log('   ' + notEvaluated.join(', '));
  }
  return collect;
}

// ============================================================
// 5. Item impact
// ============================================================
function reportItems() {
  heading('5. ITEM IMPACT  (slot-5 march completion with the item forced onto the party)');
  const g0 = createGame(1);
  const items = Object.values(g0.api.ITEM_DATA).filter(i => !i.baseId);
  const rngSel = createGame(19).rng;
  let seed = 300000;
  // Slot 5: single encounters saturate at 100% win earlier, so item
  // differences only show where the game is actually pushing back.
  const diff = FAST ? 4 : 5;
  const reps = FAST ? 6 : 22;

  let baseWins = 0, baseRuns = 0;
  for (let i = 0; i < reps * 6; i++) {
    const m = runMarch(seed++, randomParty(rngSel), diff);
    if (!m) continue;
    baseRuns++; if (m.completed) baseWins++;
  }
  const baseline = baseRuns ? baseWins / baseRuns : 0;
  console.log(`\nbaseline march-${diff} completion: ${(baseline * 100).toFixed(1)}%  (${baseRuns} marches)`);
  console.log('each item is then forced onto every unit that can hold it.\n');

  const results = [];
  for (const item of items) {
    if (item.minDifficulty && item.minDifficulty > diff) continue;
    if (item.maxDifficulty && item.maxDifficulty < diff) continue;
    let wins = 0, runs = 0;
    for (let i = 0; i < reps; i++) {
      const m = runMarch(seed++, randomParty(rngSel), diff, { forceItem: item.id });
      if (!m) continue;
      runs++; if (m.completed) wins++;
    }
    if (runs < Math.max(3, reps / 2)) continue;
    results.push({ id: item.id, name: item.name, rarity: item.rarity, win: wins / runs, fights: runs });
  }
  results.sort((a, b) => b.win - a.win);

  console.log('STRONGEST ITEMS (win rate above baseline)');
  results.slice(0, 12).forEach(r => console.log(
    '  ' + r.name.padEnd(26) + `[${r.rarity}]`.padEnd(11) +
    (r.win * 100).toFixed(0).padStart(4) + '%   ' +
    ((r.win - baseline) * 100 >= 0 ? '+' : '') + ((r.win - baseline) * 100).toFixed(0)));
  console.log('\nWEAKEST ITEMS');
  results.slice(-12).reverse().forEach(r => console.log(
    '  ' + r.name.padEnd(26) + `[${r.rarity}]`.padEnd(11) +
    (r.win * 100).toFixed(0).padStart(4) + '%   ' +
    ((r.win - baseline) * 100 >= 0 ? '+' : '') + ((r.win - baseline) * 100).toFixed(0)));

  // Rarity should correlate with power.
  console.log('\nAVERAGE WIN RATE BY RARITY (should rise with rarity)');
  for (const rar of ['common', 'uncommon', 'rare', 'epic']) {
    const list = results.filter(r => r.rarity === rar);
    if (!list.length) continue;
    const avg = list.reduce((s, r) => s + r.win, 0) / list.length;
    console.log(`  ${rar.padEnd(10)} ${bar(avg, 1, 26)} ${(avg * 100).toFixed(1)}%  (${list.length} items)`);
  }
  return results;
}

// ============================================================
// 6. March length — attrition across a sequence of fights
// ============================================================
// A per-encounter win rate says little about a march: HP carries over, so the
// question is how many fights a party survives back to back. Simulates a whole
// march (N combats, a rest, then the boss) for several values of N.
function reportMarchLength() {
  heading('6. MARCH LENGTH  (attrition across consecutive fights)');
  const rngSel = createGame(23).rng;
  let seed = 400000;
  const reps = FAST ? 25 : 90;
  const marches = FAST ? [2, 5] : [1, 3, 5, 6];

  console.log('\nCurrent map: depths 0-6 plus a rest and a boss, with 2 mid nodes');
  console.log('converted to events — about 6 fights per march before the boss');
  console.log('(the final march runs shorter, ~4 fights).\n');

  for (const diff of marches) {
    const regionId = regionForSlot(diff, rngSel);
    const normalPool = encountersFor(createGame(1), diff, 'normal', regionId);
    const bossPool = encountersFor(createGame(1), diff, 'boss');
    if (!normalPool.length || !bossPool.length) continue;

    console.log(`SLOT ${diff}  (region: ${regionId})`);
    console.log('  combats   complete%   wiped before boss%   died at fight (avg)');
    for (const combats of [3, 4, 5, 6, 7]) {
      let completed = 0, wipedEarly = 0, deathIdxSum = 0, deaths = 0, runs = 0;
      for (let r = 0; r < reps; r++) {
        const g = createGame(seed++);
        const engine = new g.api.CombatEngine();
        const team = randomParty(rngSel);
        buildParty(g, engine, team, diff, g.rng);
        runs++;

        let alive = true;
        let fightIdx = 0;
        for (let c = 0; c < combats && alive; c++) {
          const enc = normalPool[Math.floor(g.rng() * normalPool.length)];
          const res = runEncounter(g, engine, enc, { maxTurns: 40 });
          fightIdx++;
          if (res.result !== 'victory') { alive = false; break; }
          // Between fights the real game runs afterEncounter(): revive,
          // post-combat heal, and status clears.
          engine.afterEncounter();
          // A rest node heals 15% two-thirds of the way through.
          if (c === Math.floor(combats * 0.66)) {
            engine.party.forEach(u => {
              u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * 0.15));
            });
          }
        }
        if (!alive) { wipedEarly++; deathIdxSum += fightIdx; deaths++; continue; }

        const boss = bossPool[Math.floor(g.rng() * bossPool.length)];
        const bres = runEncounter(g, engine, boss, { maxTurns: 40 });
        if (bres.result === 'victory') completed++;
        else { deathIdxSum += combats + 1; deaths++; }
      }
      console.log(
        String(combats).padStart(9) +
        (completed / runs * 100).toFixed(0).padStart(11) + '%' +
        (wipedEarly / runs * 100).toFixed(0).padStart(19) + '%' +
        (deaths ? (deathIdxSum / deaths).toFixed(1) : '—').padStart(20)
      );
    }
    console.log();
  }
}

// ============================================================
// 7. March length vs progression
// ============================================================
// Cutting encounters does not only shorten a march — it also cuts the XP and
// item drops that fund the party, so the party arrives at every later march
// weaker. Difficulty compensation has to be judged against that weaker party,
// not against the current one.
//
// Measured from the real map generator:
//   current  (maxMidDepth 6/4): 5.40 fights per march
//   proposed (maxMidDepth 4/3): 4.28 fights per march   (-21%)
// Skill picks are 1 per 3 encounters (combat.js:4967), and drops roll per
// encounter, so both scale with the fight count.
function buildPartyScaled(g, engine, classIds, difficulty, rng, progressionMult) {
  buildParty(g, engine, classIds, difficulty, rng);
  if (progressionMult >= 1) return;

  // Fewer encounters => fewer skill picks and fewer/weaker items.
  engine.party.forEach(u => {
    const starters = u.allSkills.filter(s => s.starter).length;
    const learned = u.skills.length;
    const target = Math.max(starters, Math.round(starters + (learned - starters) * progressionMult));
    if (target < learned) u.skills = u.skills.slice(0, target);

    // Strip a proportional share of equipment: fewer drops means emptier slots.
    for (const slot of ['weapon', 'armor', 'trinket']) {
      const arr = u.equipment[slot];
      const filled = arr.filter(Boolean).length;
      const keep = Math.max(1, Math.round(filled * progressionMult));
      let removed = 0;
      for (let i = arr.length - 1; i >= 0 && (filled - removed) > keep; i--) {
        if (arr[i]) { arr[i] = null; removed++; }
      }
    }
    engine.computeEquipmentStats(u);
    u.hp = Math.min(u.hp, u.maxHp);
  });
}

function runMarchScaled(seed, classIds, difficulty, combats, progressionMult, enemyBuff) {
  const g = createGame(seed);
  const engine = new g.api.CombatEngine();
  buildPartyScaled(g, engine, classIds, difficulty, g.rng, progressionMult);

  const normalPool = encountersFor(g, difficulty, 'normal', regionForSlot(difficulty, g.rng));
  const bossPool = encountersFor(g, difficulty, 'boss');
  if (!normalPool.length || !bossPool.length) return null;

  // enemyBuff simulates raising difficulty to compensate for the shorter march.
  const applyBuff = () => {
    if (!enemyBuff || enemyBuff === 1) return;
    engine.enemies.forEach(e => {
      if (e.dead) return;
      e.maxHp = Math.round(e.maxHp * enemyBuff);
      e.hp = Math.round(e.hp * enemyBuff);
      e.actions = e.actions.map(a => ({
        ...a,
        damage: a.damage > 0 ? Math.max(1, Math.round(a.damage * enemyBuff)) : 0,
      }));
    });
  };

  const rest = Math.floor(combats * 0.66);
  for (let c = 0; c < combats; c++) {
    engine.initEncounter(normalPool[Math.floor(g.rng() * normalPool.length)]);
    engine.beginSpawning();
    g.drainTimers();
    applyBuff();
    const res = runEncounterLoop(g, engine);
    if (res !== 'victory') return false;
    engine.afterEncounter();
    // Rest nodes also get cut by a shorter march — scale the heal with length.
    if (c === rest) {
      engine.party.forEach(u => { u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * 0.15)); });
    }
  }
  engine.initEncounter(bossPool[Math.floor(g.rng() * bossPool.length)]);
  engine.beginSpawning();
  g.drainTimers();
  applyBuff();
  return runEncounterLoop(g, engine) === 'victory';
}

// Encounter loop for an already-initialised encounter (so buffs can be applied
// after spawning but before the first turn).
function runEncounterLoop(g, engine) {
  const { api } = g;
  const { playPlayerTurn } = require('./sim-harness.js');
  let turns = 0;
  while (turns < 40) {
    if (engine.phase === api.PHASE.VICTORY) return 'victory';
    if (engine.phase === api.PHASE.DEFEAT) return 'defeat';
    engine.startRollPhase(); g.drainTimers();
    if (engine.phase === api.PHASE.VICTORY) return 'victory';
    if (engine.phase === api.PHASE.DEFEAT) return 'defeat';
    if (engine.phase === api.PHASE.ROLLING) { engine.onDiceRevealed(); g.drainTimers(); }
    if (engine.phase === api.PHASE.PLAYER_TURN) { playPlayerTurn(engine, api, null); g.drainTimers(); }
    if (engine.phase === api.PHASE.VICTORY) return 'victory';
    if (engine.phase === api.PHASE.DEFEAT) return 'defeat';
    if (engine.phase === api.PHASE.PLAYER_TURN) { engine.endPlayerTurn(); g.drainTimers(); }
    turns++;
  }
  return 'timeout';
}

function reportLengthVsProgression() {
  heading('7. SHORTER MARCHES + DIFFICULTY COMPENSATION');
  const rngSel = createGame(31).rng;
  let seed = 600000;
  const reps = FAST ? 40 : 140;
  const marches = FAST ? [3, 5] : [2, 3, 4, 5, 6];

  console.log('\nmeasured from the real map generator:');
  console.log('  current  maxMidDepth 6/4 -> 5.40 fights per march');
  console.log('  proposed maxMidDepth 4/3 -> 4.28 fights per march  (-21%)');
  console.log('  skill picks over a run: 14.4 -> 11.4; drops fall by the same 21%\n');
  console.log('"short" also carries 79% progression, so the party is weaker at every march.\n');

  const scenarios = [
    { label: 'current (5.4 fights)',        combats: 5, prog: 1.00, buff: 1.00 },
    { label: 'short, no compensation',      combats: 4, prog: 0.79, buff: 1.00 },
    { label: 'short + 10% enemy power',     combats: 4, prog: 0.79, buff: 1.10 },
    { label: 'short + 20% enemy power',     combats: 4, prog: 0.79, buff: 1.20 },
  ];

  console.log('march   ' + scenarios.map(s => s.label.padStart(24)).join(''));
  console.log('-'.repeat(8 + scenarios.length * 24));
  const totals = scenarios.map(() => []);
  for (const diff of marches) {
    const cells = scenarios.map((s, si) => {
      let wins = 0, runs = 0;
      for (let i = 0; i < reps; i++) {
        const r = runMarchScaled(seed++, randomParty(rngSel), diff, s.combats, s.prog, s.buff);
        if (r === null) continue;
        runs++; if (r) wins++;
      }
      const v = runs ? wins / runs : 0;
      totals[si].push(v);
      return (v * 100).toFixed(0) + '%';
    });
    console.log(String(diff).padStart(5) + '   ' + cells.map(c => c.padStart(24)).join(''));
  }
  console.log('-'.repeat(8 + scenarios.length * 24));
  console.log('  avg   ' + totals.map(t =>
    ((t.reduce((a, b) => a + b, 0) / t.length) * 100).toFixed(0).padStart(23) + '%').join(''));

  console.log('\nPick the compensation that lands closest to the "current" column.');
  console.log('Anything harder than that overshoots, because the shorter march has');
  console.log('already removed a fifth of the run\'s XP and loot.');
}

// ============================================================
const t0 = Date.now();
console.log(`Last Cohort — balance simulation${FAST ? ' (fast)' : ''}`);
console.log(`samples/cell=${N}  marches=[${DIFFICULTIES.join(',')}]  classes=${CLASSES.length}`);

if (!ONLY || ONLY === 'classes') reportClasses();
if (!ONLY || ONLY === 'combos') reportCombos();
if (!ONLY || ONLY === 'encounters') reportEncounters();
if (!ONLY || ONLY === 'skills') reportSkills();
if (!ONLY || ONLY === 'items') reportItems();
if (!ONLY || ONLY === 'march') reportMarchLength();
if (!ONLY || ONLY === 'length') reportLengthVsProgression();

console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
