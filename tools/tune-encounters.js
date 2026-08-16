// ============================================================
// Last Cohort — encounter difficulty tuner
//
// For each boss and normal encounter, searches for the enemy stat multiplier
// that lands it inside a target win-rate band, and prints the recommended
// change. Measured against a party scaled for the SHORTER march (fewer skills,
// fewer items), so results already account for reduced progression.
//
//   node tools/tune-encounters.js            # bosses + normals
//   node tools/tune-encounters.js --bosses
//   node tools/tune-encounters.js --normals
// ============================================================

const { createGame, playPlayerTurn } = require('./sim-harness.js');

const argv = process.argv.slice(2);
const ONLY_BOSSES = argv.includes('--bosses');
const ONLY_NORMALS = argv.includes('--normals');
const REPS = argv.includes('--fast') ? 24 : 60;

// Progression the party actually reaches on the shortened march.
const PROGRESSION = 0.79;

// Target bands. A boss should be a real fight; a normal encounter should be
// winnable but not free.
const BOSS_TARGET = { lo: 0.45, hi: 0.70 };
const NORMAL_TARGET = { lo: 0.60, hi: 0.90 };

const TEAMS = [
  ['legionary', 'praetorian', 'cataphract'],  // pure melee, no cleanse
  ['legionary', 'medicus', 'centurion'],      // mixed
  ['legionary', 'signifer', 'ballistarius'],  // no cleanse, ranged-lean
  ['sagittarius', 'vestalis', 'wulfswestr'],  // caster/support lean
];

function build(g, e, team, diff, prog) {
  e.difficulty = diff; g.ctx.game.difficulty = diff; e.initParty(team);
  const CD = g.api.CLASS_DATA, ID = g.api.ITEM_DATA;
  const itemLevel = Math.max(0, Math.floor(diff * 0.4)), hpBonus = Math.floor(diff * 4);
  let epic = diff >= 7 ? 3 : diff >= 5 ? 1 : 0;
  e.party.forEach(u => {
    const st = u.allSkills.filter(s => s.starter), ns = u.allSkills.filter(s => !s.starter).slice();
    for (let i = ns.length - 1; i > 0; i--) { const j = Math.floor(g.rng() * (i + 1));[ns[i], ns[j]] = [ns[j], ns[i]]; }
    const nSkills = Math.max(st.length, Math.round(5 * prog));
    u.skills = [...st, ...ns.slice(0, Math.max(0, nSkills - st.length))].map(s => ({ ...s }));
    const t = CD[u.classId].tags, sq = t.includes('support') || t.includes('ranged');
    const ex = Math.max(0, hpBonus + Math.floor(u.maxHp * 0.35) - (sq ? 10 : 5));
    u.maxHp += ex; u.baseMaxHp += ex; u.hp = u.maxHp;
    const me = t.includes('melee'), ra = t.includes('ranged'), su = t.includes('support'), co = t.includes('command');
    u.bonusDamage = Math.floor(diff * (me ? 4.9 : ra ? 3.85 : 2.1) * prog);
    u.bonusBlock = Math.floor(diff * (co ? 2.6 : me ? 2.08 : 1.04) * prog);
    u.bonusHeal = Math.floor(diff * (su ? 3.36 : 0.84) * prog);
    u.bonusPoison = Math.floor(diff * (ra ? 1.05 : su ? 0.7 : 0) * prog);
    const rar = diff >= 7 ? ['uncommon', 'rare'] : diff >= 4 ? ['common', 'uncommon'] : ['common'];
    for (const slot of ['weapon', 'armor', 'trinket']) for (let si = 0; si < u.equipment[slot].length; si++) {
      if (g.rng() > prog) continue;
      const ue = epic > 0 && g.rng() < 0.3; const sr = ue ? ['epic'] : rar;
      const el = Object.values(ID).filter(i => i.slot === slot && !i.baseId &&
        (!i.minDifficulty || i.minDifficulty <= diff) && sr.includes(i.rarity) && g.api.canEquipItem(u, i));
      if (!el.length) continue;
      const p = el[Math.floor(g.rng() * el.length)];
      if (ue && p.rarity === 'epic') epic--;
      u.equipment[slot][si] = itemLevel > 0 ? g.api.createLeveledItem(p.id, itemLevel) : p.id;
    }
    e.computeEquipmentStats(u); u.hp = u.maxHp;
  });
  e.morale = 50;
}

// scalar > 1 makes the encounter harder (more enemy HP and damage).
function run(g, e, enc, scalar) {
  e.initEncounter(enc); e.beginSpawning(); g.drainTimers();
  if (scalar !== 1) {
    e.enemies.forEach(x => {
      if (x.dead) return;
      x.maxHp = Math.max(1, Math.round(x.maxHp * scalar));
      x.hp = Math.max(1, Math.round(x.hp * scalar));
      x.actions = x.actions.map(a => ({
        ...a, damage: a.damage > 0 ? Math.max(1, Math.round(a.damage * scalar)) : 0,
      }));
    });
  }
  let t = 0;
  while (t < 40 && e.phase !== 'victory' && e.phase !== 'defeat') {
    e.startRollPhase(); g.drainTimers();
    if (e.phase === 'rolling') { e.onDiceRevealed(); g.drainTimers(); }
    if (e.phase === 'player_turn') { playPlayerTurn(e, g.api, null); g.drainTimers(); }
    if (e.phase === 'player_turn') { e.endPlayerTurn(); g.drainTimers(); }
    t++;
  }
  return e.phase === 'victory';
}

let SEED = 1200000;
function winRate(enc, diffs, scalar) {
  let w = 0, n = 0;
  for (const diff of diffs) {
    for (const team of TEAMS) {
      for (let i = 0; i < Math.ceil(REPS / (diffs.length * TEAMS.length)); i++) {
        const g = createGame(SEED++); const e = new g.api.CombatEngine();
        build(g, e, team, diff, PROGRESSION);
        if (run(g, e, enc, scalar)) w++;
        n++;
      }
    }
  }
  return n ? w / n : 0;
}

// Search the scalar that brings an encounter into the band.
function solve(enc, diffs, target) {
  const base = winRate(enc, diffs, 1);
  if (base >= target.lo && base <= target.hi) return { base, scalar: 1, tuned: base };
  const candidates = base > target.hi
    ? [1.15, 1.3, 1.5, 1.75, 2.0, 2.5]     // too easy -> make harder
    : [0.85, 0.7, 0.6, 0.5, 0.4];          // too hard -> make easier
  let best = { base, scalar: 1, tuned: base };
  for (const s of candidates) {
    const wr = winRate(enc, diffs, s);
    const mid = (target.lo + target.hi) / 2;
    if (Math.abs(wr - mid) < Math.abs(best.tuned - mid)) best = { base, scalar: s, tuned: wr };
    if (wr >= target.lo && wr <= target.hi) return { base, scalar: s, tuned: wr };
  }
  return best;
}

function pct(v) { return (v * 100).toFixed(0) + '%'; }

const g0 = createGame(1);
const R = g0.api.RAW_ENCOUNTERS;

if (!ONLY_NORMALS) {
  console.log('BOSSES — target ' + pct(BOSS_TARGET.lo) + '-' + pct(BOSS_TARGET.hi) +
    ', party at ' + Math.round(PROGRESSION * 100) + '% progression\n');
  console.log('boss'.padEnd(30) + '  now   scalar   tuned   suggestion');
  console.log('-'.repeat(78));
  const out = [];
  for (const b of R.bossEncounters) {
    const diffs = [4, 5, 6, 7, 8].filter(d => !b.minDifficulty || b.minDifficulty <= d);
    if (!diffs.length) continue;
    const r = solve(b, diffs, BOSS_TARGET);
    out.push({ name: b.name, ...r });
  }
  out.sort((a, b) => a.base - b.base);
  out.forEach(r => {
    const s = r.scalar === 1 ? '  —  ' : (r.scalar > 1 ? '+' : '') + Math.round((r.scalar - 1) * 100) + '%';
    const note = r.scalar === 1 ? 'in band'
      : r.scalar > 1 ? `raise HP+damage ${Math.round((r.scalar - 1) * 100)}%`
        : `lower HP+damage ${Math.round((1 - r.scalar) * 100)}%`;
    console.log(r.name.padEnd(30) + pct(r.base).padStart(5) + s.padStart(9) + pct(r.tuned).padStart(8) + '   ' + note);
  });
}

if (!ONLY_BOSSES) {
  console.log('\n\nNORMAL ENCOUNTERS — target ' + pct(NORMAL_TARGET.lo) + '-' + pct(NORMAL_TARGET.hi) + '\n');
  const seen = new Set();
  const rows = [];
  for (const tier of ['easy', 'mid', 'hard']) {
    for (const enc of R.threatLevels[tier]) {
      if (seen.has(enc.name)) continue;
      seen.add(enc.name);
      // Real mapping (js/map.js:59 + js/data.js:579): threat rises with
      // difficulty and is capped at 3, and threat 3 draws from `hard`. So the
      // easy tier is only ever seen at march 1-2, mid at 1-4, and `hard` covers
      // marches 3-8 — a very wide band for one pool to serve.
      const tierLo = tier === 'easy' ? 1 : tier === 'mid' ? 1 : 3;
      const tierHi = tier === 'easy' ? 2 : tier === 'mid' ? 4 : 8;
      const lo = Math.max(enc.minDifficulty || 1, tierLo);
      const hi = Math.min(enc.maxDifficulty || 8, tierHi);
      const diffs = [];
      for (let d = lo; d <= hi; d++) diffs.push(d);
      if (!diffs.length) continue;
      // Sample across the whole legal range, not just its lowest marches.
      const sampled = diffs.length <= 3 ? diffs
        : [diffs[0], diffs[Math.floor(diffs.length / 2)], diffs[diffs.length - 1]];
      const base = winRate(enc, sampled, 1);
      rows.push({ name: enc.name, tier, base, diffs: sampled });
    }
  }
  rows.sort((a, b) => a.base - b.base);
  const tooHard = rows.filter(r => r.base < NORMAL_TARGET.lo);
  const tooEasy = rows.filter(r => r.base > NORMAL_TARGET.hi);
  console.log(`${rows.length} encounters: ${rows.length - tooHard.length - tooEasy.length} in band, ` +
    `${tooHard.length} too hard, ${tooEasy.length} too easy\n`);
  console.log('TOO HARD (below ' + pct(NORMAL_TARGET.lo) + ')');
  tooHard.forEach(r => console.log('  ' + r.name.padEnd(34) + `[${r.tier}]`.padEnd(8) + pct(r.base).padStart(5)));
  console.log('\nTOO EASY (above ' + pct(NORMAL_TARGET.hi) + ')');
  tooEasy.slice(0, 25).forEach(r => console.log('  ' + r.name.padEnd(34) + `[${r.tier}]`.padEnd(8) + pct(r.base).padStart(5)));
  if (tooEasy.length > 25) console.log(`  ... and ${tooEasy.length - 25} more`);
}
