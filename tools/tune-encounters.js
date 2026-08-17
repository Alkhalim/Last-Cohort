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

// Party progression relative to the in-game test scaler. The 6-march scaler
// already encodes real per-march growth, so tune at full power (the old 0.79
// anticipated a march-length cut that never shipped).
const PROGRESSION = 1.0;

// Which regions can occupy each slot — mirrors generateRoute() in js/data.js.
const REGIONS_BY_SLOT = {
  1: ['ambush_trail'],
  2: ['hunting_grounds', 'poisoned_bog'],
  3: ['old_forest', 'blood_grove', 'drowned_vale'],
  4: ['old_forest', 'blood_grove', 'drowned_vale'],
  5: ['haunted_march', 'heart_forest'],
  6: ['threshold'],
};

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
  const itemLevel = Math.max(0, Math.floor(diff * 0.55)), hpBonus = Math.floor(diff * 5.5);
  let epic = diff >= 5 ? 3 : diff >= 4 ? 1 : 0;
  e.party.forEach(u => {
    const st = u.allSkills.filter(s => s.starter), ns = u.allSkills.filter(s => !s.starter).slice();
    for (let i = ns.length - 1; i > 0; i--) { const j = Math.floor(g.rng() * (i + 1));[ns[i], ns[j]] = [ns[j], ns[i]]; }
    const nSkills = Math.max(st.length, Math.round(5 * prog));
    u.skills = [...st, ...ns.slice(0, Math.max(0, nSkills - st.length))].map(s => ({ ...s }));
    const t = CD[u.classId].tags, sq = t.includes('support') || t.includes('ranged');
    const ex = Math.max(0, hpBonus + Math.floor(u.maxHp * 0.35) - (sq ? 10 : 5));
    u.maxHp += ex; u.baseMaxHp += ex; u.hp = u.maxHp;
    const me = t.includes('melee'), ra = t.includes('ranged'), su = t.includes('support'), co = t.includes('command');
    u.bonusDamage = Math.floor(diff * (me ? 6.5 : ra ? 5.1 : 2.8) * prog);
    u.bonusBlock = Math.floor(diff * (co ? 3.5 : me ? 2.8 : 1.4) * prog);
    u.bonusHeal = Math.floor(diff * (su ? 4.5 : 1.1) * prog);
    u.bonusPoison = Math.floor(diff * (ra ? 1.4 : su ? 0.95 : 0) * prog);
    const rar = diff >= 5 ? ['uncommon', 'rare'] : diff >= 3 ? ['common', 'uncommon'] : ['common'];
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
  const STORY = g0.api.STORY_BOSS_NAMES;
  for (const b of R.bossEncounters) {
    // Story bosses only ever appear at the final march; regular bosses at the
    // slots their translated gate allows (measure the upper half, where they
    // are supposed to bite).
    let diffs;
    if (STORY.includes(b.name)) {
      diffs = [g0.api.FINAL_MARCH];
    } else {
      const gate = b.minDifficulty ? g0.api.contentToSlotGate(b.minDifficulty) : 1;
      diffs = [3, 4, 5].filter(d => d >= gate);
      if (!diffs.length) diffs = [gate];
    }
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
  // An encounter's reachable slots come from the region system: for each
  // slot, each legal region serves either its curated pool or the threat
  // tiers at its contentDiff (mirrors generateEncounterForRegion).
  const REGIONS = g0.api.REGIONS;
  const T = R.threatLevels;
  const poolFor = (slot, regionId) => {
    const region = REGIONS[regionId];
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
  };
  const slotsByEncounter = {};
  const regionsByEncounter = {};
  for (const [slot, regionIds] of Object.entries(REGIONS_BY_SLOT)) {
    for (const regionId of regionIds) {
      for (const enc of poolFor(Number(slot), regionId)) {
        (slotsByEncounter[enc.name] = slotsByEncounter[enc.name] || new Set()).add(Number(slot));
        (regionsByEncounter[enc.name] = regionsByEncounter[enc.name] || new Set()).add(regionId);
      }
    }
  }

  const seen = new Set();
  const rows = [];
  for (const tier of ['easy', 'mid', 'hard']) {
    for (const enc of R.threatLevels[tier]) {
      if (seen.has(enc.name)) continue;
      seen.add(enc.name);
      const slots = [...(slotsByEncounter[enc.name] || [])].sort((a, b) => a - b);
      if (!slots.length) { rows.push({ name: enc.name, tier: 'UNREACHABLE', base: NaN, diffs: [] }); continue; }
      const sampled = slots.length <= 3 ? slots
        : [slots[0], slots[Math.floor(slots.length / 2)], slots[slots.length - 1]];
      const base = winRate(enc, sampled, 1);
      const regions = [...(regionsByEncounter[enc.name] || [])].join(',');
      rows.push({ name: enc.name, tier: regions, base, diffs: sampled });
    }
  }
  const unreachable = rows.filter(r => Number.isNaN(r.base));
  const live = rows.filter(r => !Number.isNaN(r.base)).sort((a, b) => a.base - b.base);
  const tooHard = live.filter(r => r.base < NORMAL_TARGET.lo);
  const tooEasy = live.filter(r => r.base > NORMAL_TARGET.hi);
  console.log(`${live.length} reachable encounters: ${live.length - tooHard.length - tooEasy.length} in band, ` +
    `${tooHard.length} too hard, ${tooEasy.length} too easy` +
    (unreachable.length ? `; ${unreachable.length} unreachable` : '') + '\n');
  const line = r => '  ' + r.name.padEnd(28) + pct(r.base).padStart(5) +
    `   slots ${r.diffs.join(',')}`.padEnd(14) + ` ${r.tier}`;
  console.log('TOO HARD (below ' + pct(NORMAL_TARGET.lo) + ')');
  tooHard.forEach(r => console.log(line(r)));
  console.log('\nTOO EASY (above ' + pct(NORMAL_TARGET.hi) + ')');
  tooEasy.slice(0, 30).forEach(r => console.log(line(r)));
  if (tooEasy.length > 30) console.log(`  ... and ${tooEasy.length - 30} more`);
  if (unreachable.length) {
    console.log('\nUNREACHABLE (in no region pool)');
    unreachable.forEach(r => console.log('  ' + r.name));
  }
}
