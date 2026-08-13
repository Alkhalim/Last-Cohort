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
const DIFFICULTIES = FAST ? [1, 4, 7] : [1, 2, 3, 4, 5, 6, 7, 8];

// --- Party construction --------------------------------------------------
// Mirrors the in-game test scaler: learn skills, grow HP, equip leveled gear
// appropriate to the march, so classes are compared at realistic power.
// Deliberately mirrors startTestRun() in js/main.js — the project's own answer
// to "what does a party look like at march N". Reproducing it rather than
// inventing a curve keeps absolute win rates meaningful; an earlier version
// gave one item per slot and no training bonuses, which made every march past
// 3 look unwinnable.
function buildParty(g, engine, classIds, difficulty, rng, { allSkills = false } = {}) {
  const diff = difficulty;
  engine.difficulty = diff;
  g.ctx.game.difficulty = diff;
  engine.initParty(classIds);

  const CLASS_DATA = g.api.CLASS_DATA;
  const ITEM_DATA = g.api.ITEM_DATA;
  const skillCount = allSkills ? 99 : 5;
  const itemLevel = Math.max(0, Math.floor(diff * 0.4));
  const hpBonus = Math.floor(diff * 4);
  let epicBudget = diff >= 7 ? 3 : diff >= 5 ? 1 : 0;

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
    u.bonusDamage = Math.floor(diff * ((isMelee || isElite) ? 4.9 : isRanged ? 3.85 : 2.1));
    u.bonusBlock = Math.floor(diff * ((isCommand || isElite) ? 2.6 : isMelee ? 2.08 : 1.04));
    u.bonusHeal = Math.floor(diff * (isSupport ? 3.36 : 0.84));
    u.bonusPoison = Math.floor(diff * (isRanged ? 1.05 : isSupport ? 0.7 : 0));

    // Fill every slot, matching the in-game scaler.
    const rarities = diff >= 7 ? ['uncommon', 'rare'] : diff >= 4 ? ['common', 'uncommon'] : ['common'];
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (let si = 0; si < u.equipment[slot].length; si++) {
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

// Encounters legal at this difficulty.
function encountersFor(g, difficulty, kind) {
  const R = g.api.RAW_ENCOUNTERS;
  if (kind === 'boss') {
    return R.bossEncounters.filter(b =>
      (!b.minDifficulty || b.minDifficulty <= difficulty) &&
      (!b.maxDifficulty || b.maxDifficulty >= difficulty));
  }
  const tier = difficulty <= 2 ? 'easy' : difficulty <= 5 ? 'mid' : 'hard';
  return R.threatLevels[tier].filter(e =>
    (!e.minDifficulty || e.minDifficulty <= difficulty) &&
    (!e.maxDifficulty || e.maxDifficulty >= difficulty));
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
function runMarch(seed, classIds, difficulty, { combats = 6, collect = null, forceItem = null } = {}) {
  const g = createGame(seed);
  const engine = new g.api.CombatEngine();
  buildParty(g, engine, classIds, difficulty, g.rng);

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

  const normalPool = encountersFor(g, difficulty, 'normal');
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
    engine.party.forEach(u => {
      if (u.downed) { u.downed = false; u.hp = Math.floor(u.maxHp * 0.5); }
    });
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
  const diffs = FAST ? [3, 6] : [3, 5, 7];
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
  const diffs = FAST ? [5] : [4, 6];
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
      const pool = encountersFor(createGame(1), diff, kind);
      for (const enc of pool) {
        let wins = 0, fights = 0, turns = 0, timeouts = 0;
        const reps = kind === 'boss' ? (FAST ? 8 : 24) : (FAST ? 4 : 10);
        for (let i = 0; i < reps; i++) {
          const team = randomParty(rngSel);
          const r = sample(seed++, team, diff, enc);
          if (r.result === 'timeout') { timeouts++; continue; }
          fights++; turns += r.turns;
          if (r.result === 'victory') wins++;
        }
        if (fights === 0) continue;
        rows.push({
          kind, diff, name: enc.name,
          win: wins / fights, turns: turns / fights, fights, timeouts,
        });
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
  console.log('\nHARDEST NORMAL ENCOUNTERS');
  norm.slice(0, 12).forEach(r => console.log(
    `  march ${r.diff}  ${r.name.padEnd(32)} ${(r.win * 100).toFixed(0).padStart(4)}%  ${r.turns.toFixed(1)} turns`));
  console.log('\nEASIEST NORMAL ENCOUNTERS');
  norm.slice(-8).reverse().forEach(r => console.log(
    `  march ${r.diff}  ${r.name.padEnd(32)} ${(r.win * 100).toFixed(0).padStart(4)}%  ${r.turns.toFixed(1)} turns`));

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
    const pool = encountersFor(createGame(1), diff, 'normal');
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
  heading('5. ITEM IMPACT  (march-7 completion with the item forced onto the party)');
  const g0 = createGame(1);
  const items = Object.values(g0.api.ITEM_DATA).filter(i => !i.baseId);
  const rngSel = createGame(19).rng;
  let seed = 300000;
  // March 7: single encounters saturate at 100% win, so item differences only
  // show where the game is actually pushing back.
  const diff = FAST ? 6 : 7;
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
  const marches = FAST ? [2, 5] : [1, 3, 5, 7];

  console.log('\nCurrent map: depths 0-6 plus a rest and a boss, with 2 mid nodes');
  console.log('converted to events — about 6 fights per march before the boss.\n');

  for (const diff of marches) {
    const normalPool = encountersFor(createGame(1), diff, 'normal');
    const bossPool = encountersFor(createGame(1), diff, 'boss');
    if (!normalPool.length || !bossPool.length) continue;

    console.log(`MARCH ${diff}`);
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
          // Between fights: downed units revive at 50%, survivors keep their HP.
          engine.party.forEach(u => {
            if (u.downed) { u.downed = false; u.hp = Math.floor(u.maxHp * 0.5); }
          });
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
const t0 = Date.now();
console.log(`Last Cohort — balance simulation${FAST ? ' (fast)' : ''}`);
console.log(`samples/cell=${N}  marches=[${DIFFICULTIES.join(',')}]  classes=${CLASSES.length}`);

if (!ONLY || ONLY === 'classes') reportClasses();
if (!ONLY || ONLY === 'combos') reportCombos();
if (!ONLY || ONLY === 'encounters') reportEncounters();
if (!ONLY || ONLY === 'skills') reportSkills();
if (!ONLY || ONLY === 'items') reportItems();
if (!ONLY || ONLY === 'march') reportMarchLength();

console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
