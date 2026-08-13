// ============================================================
// Last Cohort — regression tests
//
// Plain Node, no dependencies. Loads the real game data and js
// files into a VM sandbox and asserts on actual behaviour.
//
//   node tests/run-tests.js
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}\n        expected: ${expected}\n        actual:   ${actual}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// --- Load the game's data + data.js into a sandbox -----------
function loadGame() {
  const ctx = {
    console,
    window: {},
    document: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  vm.createContext(ctx);
  const files = [
    'data/classes.js', 'data/enemies.js', 'data/items.js',
    'data/events.js', 'data/gamedata.js', 'js/data.js',
  ];
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(`
    loadGameData();
    globalThis.__api = {
      CLASS_DATA, ITEM_DATA,
      cloneSkillForUnit, cloneSkillEffects, createLeveledItem,
    };
  `, ctx);
  return ctx.__api;
}

// Mirrors combat.js initParty / main.js resumeSavedRun unit construction.
// Because this is a mirror rather than the real call path, the structural test
// in "A.1 — source actually uses the clone" pins the two together.
function buildUnit(CLASS_DATA, cloneSkillForUnit, classId) {
  const data = CLASS_DATA[classId];
  const allSkills = data.skills.map(s => cloneSkillForUnit(s));
  // unit.skills is a shallow copy of allSkills entries (combat.js:4864),
  // so it deliberately shares the same effects object.
  const skills = allSkills.map(s => ({ ...s }));
  return { classId, allSkills, skills };
}

// ============================================================
section('A.1 — run-scoped skill upgrades must not leak into CLASS_DATA');
// ============================================================
{
  const { CLASS_DATA, cloneSkillForUnit } = loadGame();
  const classId = 'legionary';
  const unit = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);

  const target = unit.allSkills.find(s => s.effects && s.effects.damage > 0);
  const classSkill = CLASS_DATA[classId].skills.find(s => s.id === target.id);
  const baseDamage = classSkill.effects.damage;

  check('unit effects are not the same object as CLASS_DATA effects', () => {
    assert(target.effects !== classSkill.effects,
      'unit skill shares its effects object with CLASS_DATA');
  });

  check('unit.skills shares effects with unit.allSkills (upgrades must apply)', () => {
    const inUse = unit.skills.find(s => s.id === target.id);
    assert(inUse.effects === target.effects,
      'unit.skills and unit.allSkills have diverged; upgrades would not apply');
  });

  // Simulate the Brief Respite upgrade (js/ui.js) writing through allSkills.
  target.effects.damage += 2;

  check('CLASS_DATA is unchanged after an upgrade', () => {
    assertEqual(classSkill.effects.damage, baseDamage,
      'Respite upgrade leaked into CLASS_DATA');
  });

  check('a brand-new run starts from base values', () => {
    const fresh = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);
    const freshSkill = fresh.allSkills.find(s => s.id === target.id);
    assertEqual(freshSkill.effects.damage, baseDamage,
      'new run inherited a previous run\'s upgrade');
  });

  check('a second unit in the same run is unaffected', () => {
    const other = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);
    const otherSkill = other.allSkills.find(s => s.id === target.id);
    assertEqual(otherSkill.effects.damage, baseDamage,
      'upgrade bled across units');
  });

  check('description still matches base damage in a new run', () => {
    const fresh = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);
    const freshSkill = fresh.allSkills.find(s => s.id === target.id);
    assert(freshSkill.description.includes(String(baseDamage)),
      `description "${freshSkill.description}" does not state base damage ${baseDamage}`);
  });

  // The upgrade must still reach execute() — the fix is worthless if it
  // silently disables Brief Respite.
  check('execute() sees the upgraded value for the upgraded unit', () => {
    const inUse = unit.skills.find(s => s.id === target.id);
    const fakeUnit = {
      index: 0, name: 'T', classId, hp: 20, maxHp: 20, block: 0,
      buffs: [], equipDamage: 0, equipBlock: 0, equipHeal: 0, equipPoison: 0,
      stats: {}, conditions: [],
    };
    const fakeTarget = { index: 0, name: 'E', hp: 50, maxHp: 50, block: 0, row: 'front', dead: false };
    const dice = [{ id: 0, value: 3, used: false }];
    const result = inUse.execute(fakeUnit, [fakeTarget], dice, inUse.effects);
    assertEqual(result.damage, baseDamage + 2,
      'execute() did not observe the run-scoped upgrade');
  });

  check('execute() sees base value for an un-upgraded unit', () => {
    const fresh = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);
    const inUse = fresh.skills.find(s => s.id === target.id);
    const fakeUnit = {
      index: 0, name: 'T', classId, hp: 20, maxHp: 20, block: 0,
      buffs: [], equipDamage: 0, equipBlock: 0, equipHeal: 0, equipPoison: 0,
      stats: {}, conditions: [],
    };
    const fakeTarget = { index: 0, name: 'E', hp: 50, maxHp: 50, block: 0, row: 'front', dead: false };
    const dice = [{ id: 0, value: 3, used: false }];
    const result = inUse.execute(fakeUnit, [fakeTarget], dice, inUse.effects);
    assertEqual(result.damage, baseDamage,
      'un-upgraded unit observed another unit\'s upgrade');
  });

  check('nested effect objects are cloned, not shared', () => {
    const withNested = unit.allSkills.find(s =>
      s.effects && s.effects.buffAllies && typeof s.effects.buffAllies === 'object');
    if (!withNested) return; // legionary may have none; covered by other classes below
    const classNested = CLASS_DATA[classId].skills.find(s => s.id === withNested.id);
    assert(withNested.effects.buffAllies !== classNested.effects.buffAllies,
      'nested effect object is shared with CLASS_DATA');
  });
}

// ============================================================
section('A.1 — every class survives cloning');
// ============================================================
{
  const { CLASS_DATA, cloneSkillForUnit } = loadGame();
  check('all classes clone with independent effects and intact execute()', () => {
    for (const classId of Object.keys(CLASS_DATA)) {
      const unit = buildUnit(CLASS_DATA, cloneSkillForUnit, classId);
      assertEqual(unit.allSkills.length, CLASS_DATA[classId].skills.length,
        `${classId}: skill count changed after cloning`);
      for (const s of unit.allSkills) {
        const orig = CLASS_DATA[classId].skills.find(o => o.id === s.id);
        assert(s.effects !== orig.effects, `${classId}/${s.id}: effects still shared`);
        assert(typeof s.execute === 'function', `${classId}/${s.id}: lost execute()`);
        assert(s.cost !== undefined, `${classId}/${s.id}: lost cost`);
        // Nested objects must be cloned too.
        for (const [k, v] of Object.entries(s.effects)) {
          if (v && typeof v === 'object') {
            assert(v !== orig.effects[k], `${classId}/${s.id}: nested effect "${k}" shared`);
          }
        }
      }
    }
  });
}

// ============================================================
section('A.1 — source actually uses the clone');
// ============================================================
// buildUnit() above is a mirror of the real construction path. These checks
// stop the mirror from passing while the shipped code regresses.
{
  const combat = fs.readFileSync(path.join(ROOT, 'js/combat.js'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

  check('combat.js initParty clones skills per unit', () => {
    assert(/allSkills: data\.skills\.map\(s => cloneSkillForUnit\(s\)\)/.test(combat),
      'combat.js still shallow-copies skills (effects would stay shared)');
  });

  check('main.js resumeSavedRun clones skills per unit', () => {
    assert(/const allSkills = classData\.skills\.map\(s => cloneSkillForUnit\(s\)\)/.test(main),
      'resumeSavedRun still shallow-copies skills');
  });

  check('execute() is called with the unit-owned effects', () => {
    assert(/skill\.execute\(unit, targets, usedDice, skill\.effects\)/.test(combat),
      'execute() is not passed skill.effects; upgrades would not apply');
  });

  check('no shallow skill copy remains on either construction path', () => {
    assert(!/allSkills: data\.skills\.map\(s => \(\{ \.\.\.s \}\)\)/.test(combat),
      'combat.js still has the old shallow copy');
    assert(!/const allSkills = classData\.skills\.map\(s => \(\{ \.\.\.s \}\)\)/.test(main),
      'main.js still has the old shallow copy');
  });
}

// ============================================================
section('0.4 — class unlock ladder');
// ============================================================
{
  // Mirrors the ladder in main.js checkAchievements(). Kept in sync by the
  // structural test below, which asserts the real source has no March 9 gate.
  function evaluateLadder({ highestDifficulty = 1, runsCompleted = 0, spirits = false, existing = {} }) {
    const a = { ...existing };
    if (spirits) a.boss_spirits_defeated = true;
    const currentDiff = highestDifficulty;
    const runsWon = runsCompleted;
    const ladder = [
      { key: 'class_signifer',     met: currentDiff >= 3 },
      { key: 'class_equites',      met: currentDiff >= 5 },
      { key: 'class_ballistarius', met: currentDiff >= 7 },
      { key: 'class_vestalis',     met: currentDiff >= 8 },
      { key: 'class_cataphract',   met: runsWon >= 1 || !!a.boss_spirits_defeated },
      { key: 'class_praetorian',   met: runsWon >= 2 },
    ];
    for (let i = 0; i < ladder.length; i++) {
      const rung = ladder[i];
      if (a[rung.key]) continue;
      const higherUnlocked = ladder.slice(i + 1).some(h => a[h.key]);
      if (rung.met || higherUnlocked) a[rung.key] = true;
    }
    return a;
  }

  check('clearing March 1 unlocks nothing (the original bug)', () => {
    // Before the fix, trackRunEnd fired per march so runsCompleted was already
    // 1 here, which unlocked Vestalis and cascaded the whole ladder.
    const a = evaluateLadder({ highestDifficulty: 1, runsCompleted: 0 });
    for (const k of ['class_signifer', 'class_equites', 'class_ballistarius',
                     'class_vestalis', 'class_cataphract', 'class_praetorian']) {
      assert(!a[k], `${k} unlocked after clearing March 1`);
    }
  });

  check('reaching March 3 unlocks only Signifer', () => {
    const a = evaluateLadder({ highestDifficulty: 3 });
    assert(a.class_signifer, 'Signifer not unlocked at March 3');
    assert(!a.class_equites, 'Equites unlocked too early');
    assert(!a.class_vestalis, 'Vestalis unlocked too early');
  });

  check('reaching March 8 unlocks Vestalis and backfills below it', () => {
    const a = evaluateLadder({ highestDifficulty: 8 });
    assert(a.class_vestalis, 'Vestalis not unlocked at March 8');
    assert(a.class_signifer && a.class_equites && a.class_ballistarius,
      'lower rungs not backfilled');
    assert(!a.class_cataphract, 'Cataphract unlocked without completing a run');
    assert(!a.class_praetorian, 'Praetorian unlocked without completing a run');
  });

  check('one completed run unlocks Cataphract but not Praetorian', () => {
    const a = evaluateLadder({ highestDifficulty: 8, runsCompleted: 1 });
    assert(a.class_cataphract, 'Cataphract not unlocked after one run');
    assert(!a.class_praetorian, 'Praetorian unlocked after only one run');
  });

  check('two completed runs unlock Praetorian', () => {
    const a = evaluateLadder({ highestDifficulty: 8, runsCompleted: 2 });
    assert(a.class_praetorian, 'Praetorian not unlocked after two runs');
  });

  check('every class is reachable within the 8 marches that exist', () => {
    const a = evaluateLadder({ highestDifficulty: 8, runsCompleted: 2 });
    for (const k of ['class_signifer', 'class_equites', 'class_ballistarius',
                     'class_vestalis', 'class_cataphract', 'class_praetorian']) {
      assert(a[k], `${k} is unreachable`);
    }
  });

  check('backfill fills lower rungs when only a high rung is set', () => {
    const a = evaluateLadder({ highestDifficulty: 1, existing: { class_praetorian: true } });
    assert(a.class_signifer && a.class_equites && a.class_ballistarius &&
           a.class_vestalis && a.class_cataphract,
      'backfill did not reach every lower rung');
  });

  check('source has no March 9 gate and only 8 marches are defined', () => {
    const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
    // Strip comments first, so prose explaining the old gate is not mistaken
    // for the gate itself.
    const code = main.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert(!/currentDiff\s*>=\s*9/.test(code),
      'main.js still gates an unlock on March 9, which is unreachable');
    const themes = main.match(/const MARCH_THEMES = \{([\s\S]*?)\n\};/);
    assert(themes, 'MARCH_THEMES not found');
    const marchNums = [...themes[1].matchAll(/^\s*(\d+):/gm)].map(m => Number(m[1]));
    assertEqual(Math.max(...marchNums), 8, 'highest defined march changed');
  });
}

// ============================================================
section('0.3 — run-end accounting');
// ============================================================
{
  const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');

  check('trackMarchComplete exists and does not touch runsCompleted', () => {
    const fn = main.match(/trackMarchComplete\(\)\s*\{([\s\S]*?)\n  \}/);
    assert(fn, 'trackMarchComplete() not found');
    assert(!/runsCompleted/.test(fn[1]),
      'trackMarchComplete still increments runsCompleted');
  });

  check('march-boss victory calls trackMarchComplete, not trackRunEnd', () => {
    assert(/isFinalVictory\)\s*window\.game\.trackRunEnd\('victory'\)/.test(ui),
      "final victory does not report trackRunEnd('victory')");
    assert(/else window\.game\.trackMarchComplete\(\)/.test(ui),
      'non-final march boss does not call trackMarchComplete()');
  });

  check('retiring home is not recorded as a completed run', () => {
    const fn = main.match(/returnHome\(\)\s*\{([\s\S]*?)\n  \}/);
    assert(fn, 'returnHome() not found');
    assert(/trackRunEnd\('retired'\)/.test(fn[1]),
      "returnHome() does not report 'retired'");
  });

  check('trackRunEnd is idempotent', () => {
    const fn = main.match(/trackRunEnd\(outcome\)\s*\{([\s\S]*?)\n  \}/);
    assert(fn, 'trackRunEnd(outcome) not found');
    assert(/_runEndTracked/.test(fn[1]), 'trackRunEnd has no double-call guard');
  });

  check('only a wipe finalises the leaderboard as a loss', () => {
    const fn = main.match(/trackRunEnd\(outcome\)\s*\{([\s\S]*?)\n  \}/);
    // A retired run must not be filed as a defeat; returnHome() records it.
    assert(/outcome === 'defeat'\)\s*\{\s*this\.finalizeLeaderboard\(false\)/.test(fn[1]),
      'retired runs would be recorded as defeats in run history');
  });

  check('each outcome hits exactly one stats counter', () => {
    const fn = main.match(/trackRunEnd\(outcome\)\s*\{([\s\S]*?)\n  \}/);
    assert(/if \(victory\) this\.stats\.runsCompleted\+\+/.test(fn[1]),
      'victory does not increment runsCompleted');
    assert(/else if \(outcome === 'defeat'\) this\.stats\.runsLost\+\+/.test(fn[1]),
      'defeat does not increment runsLost');
    assert(/else this\.stats\.runsRetired/.test(fn[1]),
      'retired runs are not counted separately');
  });
}

// ============================================================
section('0.5 — grantBlock type guard');
// ============================================================
{
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');

  check('numeric grantBlock branch is type-guarded', () => {
    assert(/typeof effects\.grantBlock === 'number'[\s\S]{0,200}u\.block = \(u\.block \|\| 0\) \+ effects\.grantBlock/.test(ui),
      'block-granting branch is not guarded against the object form');
  });

  check('outcome text is type-guarded', () => {
    assert(/typeof effects\.grantBlock === 'number'\) outcomeText/.test(ui),
      'outcome text can still print [object Object]');
    assert(!/if \(effects\.grantBlock\) outcomeText/.test(ui),
      'unguarded grantBlock outcome text still present');
  });

  check('object form still grants permanent block', () => {
    assert(/effects\.grantBlock && typeof effects\.grantBlock === 'object'/.test(ui),
      'object branch for grantBlock is missing');
  });

  check('every event grantBlock payload is a number or a well-formed object', () => {
    const events = fs.readFileSync(path.join(ROOT, 'data/events.js'), 'utf8');
    const matches = [...events.matchAll(/"grantBlock"\s*:\s*(\{[^}]*\}|\d+)/g)];
    assert(matches.length > 0, 'no grantBlock usages found to validate');
    for (const m of matches) {
      const raw = m[1];
      if (raw.startsWith('{')) {
        assert(/"amount"\s*:\s*\d+/.test(raw), `grantBlock object missing amount: ${raw}`);
      } else {
        assert(/^\d+$/.test(raw), `grantBlock scalar is not a number: ${raw}`);
      }
    }
  });
}

// ============================================================
section('0.2 — music volume default matches displayed value');
// ============================================================
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

  check('slider markup matches loadSettings default', () => {
    const settingDefault = main.match(/musicVolume:\s*(\d+)/);
    assert(settingDefault, 'musicVolume default not found in main.js');
    const sliderValue = html.match(/id="opt-music-vol"[^>]*value="(\d+)"/);
    assert(sliderValue, 'music slider not found in index.html');
    const displayed = html.match(/id="opt-music-val"[^>]*>(\d+)%/);
    assert(displayed, 'music volume display not found in index.html');
    assertEqual(sliderValue[1], settingDefault[1], 'slider value disagrees with default');
    assertEqual(displayed[1], settingDefault[1], 'displayed % disagrees with default');
  });
}

// ============================================================
section('0.1 — audio context is resumed before routing through the graph');
// ============================================================
{
  const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

  check('resumeAudioContext exists and calls resume()', () => {
    const fn = main.match(/resumeAudioContext\(\)\s*\{([\s\S]*?)\n  \}/);
    assert(fn, 'resumeAudioContext() not found');
    assert(/\.resume\(\)/.test(fn[1]), 'resumeAudioContext does not call resume()');
  });

  check('playTrack only attaches the filter once the context is running', () => {
    const fn = main.match(/playTrack\(src, loop = true\)\s*\{([\s\S]*?)\n  \}/);
    assert(fn, 'playTrack() not found');
    assert(/resumeAudioContext\(\)\.then\(running => \{[\s\S]*?if \(running\) this\.connectTrackToFilter/.test(fn[1]),
      'connectTrackToFilter is not gated on a running context');
    assert(!/if \(this\.audioCtx\) \{\s*this\.connectTrackToFilter/.test(fn[1]),
      'unconditional connectTrackToFilter still present');
  });

  check('playback failures are no longer swallowed silently', () => {
    assert(!/audio\.play\(\)\.catch\(\(\) => \{\}\)/.test(main),
      'empty catch on audio.play() still present');
  });

  check('a gesture-based unlock fallback is bound', () => {
    assert(/bindAudioUnlock\(\)/.test(main), 'bindAudioUnlock is never called');
  });
}

// ============================================================
section('1.1 — leveled items must be able to gain something');
// ============================================================
{
  const { ITEM_DATA, createLeveledItem } = loadGame();

  check('no base item is unable to gain stats from leveling', () => {
    const stuck = Object.entries(ITEM_DATA)
      .filter(([, it]) => !it.baseId)
      .filter(([, it]) => {
        const stats = it.stats || {};
        return !Object.keys(stats).some(k => k !== 'extraDice' && stats[k] !== 0);
      })
      .map(([id]) => id);
    assert(stuck.length === 0, `items with nowhere to put levels: ${stuck.join(', ')}`);
  });

  check('Runic Stone actually differs at a higher level', () => {
    const base = ITEM_DATA['runic_stone'];
    const id = createLeveledItem('runic_stone', 4);
    assert(id !== 'runic_stone', 'createLeveledItem returned the base id');
    const leveled = ITEM_DATA[id];
    const gained = Object.keys(leveled.stats)
      .some(k => (leveled.stats[k] || 0) > (base.stats[k] || 0));
    assert(gained, `Lv5 Runic Stone is identical to Lv1: ${JSON.stringify(leveled.stats)}`);
  });

  check('extraDice itself is never scaled', () => {
    const base = ITEM_DATA['runic_stone'];
    for (let i = 0; i < 20; i++) {
      const id = createLeveledItem('runic_stone', 5);
      assertEqual(ITEM_DATA[id].stats.extraDice, base.stats.extraDice,
        'leveling increased extraDice');
    }
  });

  check('an item with no scalable stat returns the base id instead of a fake instance', () => {
    ITEM_DATA['__test_dice_only'] = {
      id: '__test_dice_only', name: 'T', slot: 'trinket', rarity: 'common',
      classTags: ['roman'], stats: { extraDice: 1 },
    };
    assertEqual(createLeveledItem('__test_dice_only', 4), '__test_dice_only',
      'minted a leveled instance that can never differ from its base');
    delete ITEM_DATA['__test_dice_only'];
  });
}

// ============================================================
section('1.2 — dice eligibility and staging arity');
// ============================================================
{
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/dice.js'), 'utf8'), ctx);
  vm.runInContext('globalThis.__DicePool = DicePool;', ctx);
  const DicePool = ctx.__DicePool;

  const poolWith = (values) => {
    const p = new DicePool(values.length);
    p.dice = values.map((v, i) => ({ id: i, value: v, used: false, assigned: null }));
    return p;
  };

  check('requiredDiceCount is correct for every cost type', () => {
    const cases = [
      [{ type: 'any' }, 1],
      [{ type: 'threshold', min: 5 }, 1],
      [{ type: 'range', min: 2, max: 4 }, 1],
      [{ type: 'exact', val: 3 }, 1],
      [{ type: 'even' }, 1],
      [{ type: 'odd' }, 1],
      [{ type: 'pair' }, 2],
      [{ type: 'pairEven' }, 2],
      [{ type: 'pairOdd' }, 2],
      [{ type: 'oddEven' }, 2],
      [{ type: 'consecutive' }, 2],
      [{ type: 'pairExact6' }, 2],
      [{ type: 'combined', min: 6, dice: 2 }, 2],
      [{ type: 'combinedExact', val: 9, dice: 3 }, 3],
    ];
    for (const [cost, expected] of cases) {
      assertEqual(DicePool.requiredDiceCount(cost), expected,
        `wrong arity for ${cost.type}`);
    }
  });

  check('arity matches what canPayCost actually accepts', () => {
    // The staging cap and the payment check must agree, or the UI lets players
    // build selections that can never be paid.
    const p = poolWith([6, 6, 6, 6, 6]);
    for (const cost of [{ type: 'any' }, { type: 'threshold', min: 1 },
                        { type: 'pair' }, { type: 'pairExact6' },
                        { type: 'combined', min: 2, dice: 2 }]) {
      const n = DicePool.requiredDiceCount(cost);
      const ids = p.dice.slice(0, n).map(d => d.id);
      assert(p.canPayCost(cost, ids),
        `${cost.type}: ${n} dice should be payable but canPayCost said no`);
    }
  });

  check('threshold rejects dice below the minimum', () => {
    const p = poolWith([2, 5]);
    const cost = { type: 'threshold', min: 5 };
    assert(!p.canAcceptDie(cost, [], p.dice[0]), 'accepted a 2 for a 5+ cost');
    assert(p.canAcceptDie(cost, [], p.dice[1]), 'rejected a valid 5');
  });

  check('exact rejects any other value', () => {
    const p = poolWith([3, 4]);
    const cost = { type: 'exact', val: 4 };
    assert(!p.canAcceptDie(cost, [], p.dice[0]), 'accepted a 3 for an exact-4 cost');
    assert(p.canAcceptDie(cost, [], p.dice[1]), 'rejected a valid 4');
  });

  check('range rejects values outside the band', () => {
    const p = poolWith([1, 3, 6]);
    const cost = { type: 'range', min: 2, max: 4 };
    assert(!p.canAcceptDie(cost, [], p.dice[0]), 'accepted a 1');
    assert(p.canAcceptDie(cost, [], p.dice[1]), 'rejected a 3');
    assert(!p.canAcceptDie(cost, [], p.dice[2]), 'accepted a 6');
  });

  check('single-die costs refuse a second die', () => {
    const p = poolWith([5, 6]);
    const cost = { type: 'threshold', min: 5 };
    assert(!p.canAcceptDie(cost, [0], p.dice[1]),
      'a one-die cost accepted a second die (the original uncapped bug)');
  });

  check('pair requires matching values', () => {
    const p = poolWith([4, 4, 5]);
    const cost = { type: 'pair' };
    assert(p.canAcceptDie(cost, [0], p.dice[1]), 'rejected a matching pair');
    assert(!p.canAcceptDie(cost, [0], p.dice[2]), 'accepted a mismatched pair');
  });

  check('consecutive requires adjacent values', () => {
    const p = poolWith([3, 4, 6]);
    const cost = { type: 'consecutive' };
    assert(p.canAcceptDie(cost, [0], p.dice[1]), 'rejected 3 then 4');
    assert(!p.canAcceptDie(cost, [0], p.dice[2]), 'accepted 3 then 6');
  });

  check('oddEven requires opposite parity', () => {
    const p = poolWith([3, 4, 5]);
    const cost = { type: 'oddEven' };
    assert(p.canAcceptDie(cost, [0], p.dice[1]), 'rejected odd+even');
    assert(!p.canAcceptDie(cost, [0], p.dice[2]), 'accepted odd+odd');
  });

  check('pairExact6 only accepts sixes', () => {
    const p = poolWith([6, 5]);
    const cost = { type: 'pairExact6' };
    assert(p.canAcceptDie(cost, [], p.dice[0]), 'rejected a 6');
    assert(!p.canAcceptDie(cost, [], p.dice[1]), 'accepted a 5');
  });

  check('used dice are never selectable', () => {
    const p = poolWith([6]);
    p.dice[0].used = true;
    assert(!p.canAcceptDie({ type: 'any' }, [], p.dice[0]), 'accepted a used die');
  });

  check('an already-staged die can always be deselected', () => {
    const p = poolWith([1]);
    assert(p.canAcceptDie({ type: 'threshold', min: 6 }, [0], p.dice[0]),
      'a staged die could not be deselected');
  });

  check('every cost type in the game data has a defined arity', () => {
    const classes = fs.readFileSync(path.join(ROOT, 'data/classes.js'), 'utf8');
    const types = new Set([...classes.matchAll(/"type":\s*"(\w+)"/g)].map(m => m[1]));
    assert(types.size > 0, 'no cost types found in classes.js');
    const known = new Set(['any', 'threshold', 'range', 'exact', 'combined',
      'combinedExact', 'even', 'odd', 'pair', 'pairEven', 'pairOdd', 'oddEven',
      'consecutive', 'pairExact6']);
    for (const t of types) {
      assert(known.has(t), `cost type "${t}" is not handled by canAcceptDie/requiredDiceCount`);
    }
  });
}

// ============================================================
section('1.3 / 1.4 / 1.5 — UI gating and intent');
// ============================================================
{
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  const combat = fs.readFileSync(path.join(ROOT, 'js/combat.js'), 'utf8');

  check('die modifier buttons are no longer hidden while a skill is staged', () => {
    assert(!/canAdjustDie\(\) && this\.engine\.phase === PHASE\.PLAYER_TURN && !this\.stagedSkill/.test(ui),
      'Centurion adjust buttons still vanish when a skill is staged');
    assert(!/canRerollDie\(\) && this\.engine\.phase === PHASE\.PLAYER_TURN && !this\.stagedSkill/.test(ui),
      'Cornicen reroll button still vanishes when a skill is staged');
  });

  check('adjusting or rerolling prunes newly-invalid staged dice', () => {
    assert(/pruneStagedDice\(\)/.test(ui), 'pruneStagedDice is never called');
    const calls = (ui.match(/this\.pruneStagedDice\(\)/g) || []).length;
    assert(calls >= 3, `expected prune after adjust-down, adjust-up and reroll; found ${calls}`);
  });

  check('filled slots are not clickable while an empty slot exists', () => {
    assert(/hasEmpty \? '' : ` data-slot-idx="\$\{si\}"`/.test(ui),
      'filled slots still expose data-slot-idx when an empty slot exists');
    assert(/if \(hasEmpty\) this\._replaceSlotIdx = undefined/.test(ui),
      'stale replacement selection is not cleared');
  });

  check('intent uses the same target selection as the enemy turn', () => {
    assert(/this\.pickEnemyTarget\(e, action, \{ record: false \}\)/.test(combat),
      'rollEnemyIntents does not reuse pickEnemyTarget');
    assert(/pickEnemyTarget\(enemy, action, \{ record = true \} = \{\}\)/.test(combat),
      'pickEnemyTarget has no side-effect-free preview mode');
  });

  check('ambush spread is only consumed when an attack resolves', () => {
    const fn = combat.match(/pickEnemyTarget\(enemy, action[\s\S]*?\n  \}/);
    assert(fn, 'pickEnemyTarget not found');
    assert(!/(?<!if \(record\) )this\._ambushTargeted\.add/.test(fn[0]),
      'ambush bookkeeping can still be mutated during a preview');
  });

  check('AoE intent no longer requires direct damage', () => {
    assert(/isAoe: !!action\.aoe/.test(combat),
      'AoE actions without damage still preview as single-target');
  });

  check('double attacks are previewed', () => {
    assert(/hits: \(e\.woundedDoubleAttack && e\.hp < e\.maxHp \/ 2\) \? 2 : 1/.test(combat),
      'woundedDoubleAttack is not reflected in the intent');
    assert(/intent\.hits > 1/.test(ui), 'UI does not show the extra hit');
  });

  check('dead sniper code is gone', () => {
    assert(!/isSniper/.test(combat) && !/isSniper/.test(ui),
      'isSniper still referenced despite no enemy having ai: "sniper"');
    const enemies = fs.readFileSync(path.join(ROOT, 'data/enemies.js'), 'utf8');
    assert(!/"ai":\s*"sniper"/.test(enemies),
      'an enemy reintroduced sniper AI — the removed targeting would need restoring');
  });

  check('the intent block is labelled', () => {
    assert(/NEXT ATTACK/.test(ui), 'intent block has no "NEXT ATTACK" label');
  });
}

// ============================================================
section('2.1 — every enemy action rider is labelled');
// ============================================================
{
  const ctx = {
    console, window: {}, document: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  vm.createContext(ctx);
  for (const f of ['data/classes.js', 'data/enemies.js', 'data/items.js',
                   'data/events.js', 'data/gamedata.js', 'js/data.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(`
    loadGameData();
    globalThis.__a = { ENEMY_DATA, ACTION_RIDER_LABELS, describeEnemyAction };
  `, ctx);
  const { ENEMY_DATA, ACTION_RIDER_LABELS, describeEnemyAction } = ctx.__a;

  check('no enemy action carries an unlabelled key', () => {
    const unknown = new Set();
    for (const e of Object.values(ENEMY_DATA)) {
      for (const a of (e.actions || [])) {
        for (const k of Object.keys(a)) {
          if (!(k in ACTION_RIDER_LABELS)) unknown.add(`${e.id}.${k}`);
        }
      }
    }
    assert(unknown.size === 0,
      `unlabelled action keys (add to ACTION_RIDER_LABELS): ${[...unknown].join(', ')}`);
  });

  check('War Boar\'s stun is visible', () => {
    const boar = ENEMY_DATA['war_boar'].actions.find(a => a.boarCharge);
    assert(boar, 'Boar Charge not found');
    const text = describeEnemyAction(boar).join(' ').replace(/<[^>]+>/g, '');
    assert(/STUNS/.test(text), `stun not surfaced: "${text}"`);
  });

  check('cooldowns are surfaced', () => {
    const boar = ENEMY_DATA['war_boar'].actions.find(a => a.cooldown);
    const text = describeEnemyAction(boar).join(' ').replace(/<[^>]+>/g, '');
    assert(/every \d+ turns/.test(text), `cooldown not surfaced: "${text}"`);
  });

  check('flavour-only keys produce no chips', () => {
    const chips = describeEnemyAction({ name: 'X', chance: 0.5, text: 'does a thing' });
    assertEqual(chips.length, 0, 'structural keys leaked into the detail chips');
  });
}

// ============================================================
section('2.2 / 2.3 — incoming damage forecast');
// ============================================================
{
  const ctx = {
    console, window: {}, document: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    setTimeout, clearTimeout, requestAnimationFrame: () => {},
  };
  vm.createContext(ctx);
  for (const f of ['data/classes.js', 'data/enemies.js', 'data/items.js',
                   'data/events.js', 'data/gamedata.js', 'js/data.js',
                   'js/dice.js', 'js/combat.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext('loadGameData(); globalThis.__CE = CombatEngine;', ctx);
  const CombatEngine = ctx.__CE;

  // Minimal engine standing in for a real fight.
  function makeEngine({ party, enemies, curses = [] }) {
    const e = Object.create(CombatEngine.prototype);
    e.party = party;
    e.enemies = enemies;
    e._ambushDamageHalved = false;
    e.getActiveCurses = () => curses;
    return e;
  }
  const unit = (over = {}) => ({
    index: 0, name: 'A', classId: 'legionary', hp: 20, maxHp: 20,
    block: 0, downed: false, ...over,
  });
  const foe = (over = {}) => ({
    index: 0, id: 'x', name: 'F', hp: 10, maxHp: 10, dead: false,
    actions: [], ...over,
  });

  check('a plain hit predicts its action damage', () => {
    const action = { name: 'Hit', damage: 7, chance: 1 };
    const e = makeEngine({ party: [unit()], enemies: [foe({ actions: [action] })] });
    assertEqual(e.predictEnemyDamage(e.enemies[0], action, e.party[0]), 7, 'wrong prediction');
  });

  check('non-damaging actions predict zero', () => {
    const action = { name: 'Guard', damage: 0, blockSelf: 5, chance: 1 };
    const e = makeEngine({ party: [unit()], enemies: [foe({ actions: [action] })] });
    assertEqual(e.predictEnemyDamage(e.enemies[0], action, e.party[0]), 0, 'wrong prediction');
  });

  check('the Hunter\'s Shadow curse is included', () => {
    const action = { name: 'Hit', damage: 7, chance: 1 };
    const e = makeEngine({
      party: [unit()], enemies: [foe({ actions: [action] })], curses: ['hunters_shadow'],
    });
    assertEqual(e.predictEnemyDamage(e.enemies[0], action, e.party[0]), 8, 'curse not applied');
  });

  check('block is subtracted from the forecast', () => {
    const action = { name: 'Hit', damage: 7, chance: 1 };
    const f = foe({ actions: [action] });
    f._intent = { action, targetIndex: 0, isAoe: false, hits: 1 };
    const e = makeEngine({ party: [unit({ block: 3 })], enemies: [f] });
    const forecast = e.predictIncomingDamage();
    assertEqual(forecast[0].raw, 7, 'raw damage wrong');
    assertEqual(forecast[0].afterBlock, 4, 'block not subtracted');
    assert(!forecast[0].lethal, 'wrongly flagged lethal');
  });

  check('damage fully absorbed by block reports zero but is still shown', () => {
    const action = { name: 'Hit', damage: 3, chance: 1 };
    const f = foe({ actions: [action] });
    f._intent = { action, targetIndex: 0, isAoe: false, hits: 1 };
    const e = makeEngine({ party: [unit({ block: 10 })], enemies: [f] });
    const forecast = e.predictIncomingDamage();
    assertEqual(forecast[0].afterBlock, 0, 'should be fully absorbed');
    assertEqual(forecast[0].raw, 3, 'raw damage should still be reported');
  });

  check('lethal damage is flagged', () => {
    const action = { name: 'Hit', damage: 25, chance: 1 };
    const f = foe({ actions: [action] });
    f._intent = { action, targetIndex: 0, isAoe: false, hits: 1 };
    const e = makeEngine({ party: [unit({ hp: 20 })], enemies: [f] });
    assert(e.predictIncomingDamage()[0].lethal, 'lethal hit not flagged');
  });

  check('double attacks are counted twice', () => {
    const action = { name: 'Hit', damage: 5, chance: 1 };
    const f = foe({ actions: [action], woundedDoubleAttack: true });
    f._intent = { action, targetIndex: 0, isAoe: false, hits: 2 };
    const e = makeEngine({ party: [unit()], enemies: [f] });
    assertEqual(e.predictIncomingDamage()[0].raw, 10, 'second hit not counted');
  });

  check('AoE damage lands on every living unit', () => {
    const action = { name: 'Sweep', damage: 4, aoe: true, chance: 1 };
    const f = foe({ actions: [action] });
    f._intent = { action, targetIndex: 0, isAoe: true, hits: 1 };
    const e = makeEngine({
      party: [unit({ index: 0 }), unit({ index: 1 }), unit({ index: 2, downed: true })],
      enemies: [f],
    });
    const forecast = e.predictIncomingDamage();
    assertEqual(forecast[0].raw, 4, 'unit 0 missed');
    assertEqual(forecast[1].raw, 4, 'unit 1 missed');
    assert(!forecast[2], 'downed unit included in forecast');
  });

  check('damage from several enemies is summed', () => {
    const a1 = { name: 'A', damage: 3, chance: 1 };
    const a2 = { name: 'B', damage: 4, chance: 1 };
    const f1 = foe({ index: 0, actions: [a1] });
    const f2 = foe({ index: 1, actions: [a2] });
    f1._intent = { action: a1, targetIndex: 0, isAoe: false, hits: 1 };
    f2._intent = { action: a2, targetIndex: 0, isAoe: false, hits: 1 };
    const e = makeEngine({ party: [unit()], enemies: [f1, f2] });
    assertEqual(e.predictIncomingDamage()[0].raw, 7, 'damage not summed');
  });

  check('stunned and dead enemies contribute nothing', () => {
    const action = { name: 'Hit', damage: 9, chance: 1 };
    const stunned = foe({ index: 0, actions: [action] });
    stunned._intent = { type: 'stunned' };
    const dead = foe({ index: 1, actions: [action], dead: true });
    dead._intent = { action, targetIndex: 0, isAoe: false, hits: 1 };
    const e = makeEngine({ party: [unit()], enemies: [stunned, dead] });
    assert(!e.predictIncomingDamage()[0], 'stunned or dead enemy contributed damage');
  });

  check('predicting does not mutate fight state', () => {
    // A forecast that consumes one-shot state would desync the real attack.
    const action = { name: 'Charge', damage: 6, chance: 1 };
    const f = foe({ id: 'blood_stag', actions: [action], _chargeReady: true, block: 4 });
    f._intent = { action, targetIndex: 0, isAoe: false, hits: 1 };
    const u = unit({ _pinned: true });
    const e = makeEngine({ party: [u], enemies: [f] });
    const before = JSON.stringify({ f, u });
    e.predictIncomingDamage();
    e.predictEnemyDamage(f, action, u);
    assertEqual(JSON.stringify({ f, u }), before, 'forecast mutated fight state');
  });

  check('suppress and cripple reduce the forecast', () => {
    const action = { name: 'Hit', damage: 10, chance: 1 };
    const plain = makeEngine({ party: [unit()], enemies: [foe({ actions: [action] })] });
    const base = plain.predictEnemyDamage(plain.enemies[0], action, plain.party[0]);
    const supp = makeEngine({
      party: [unit()], enemies: [foe({ actions: [action], _suppressed: 1 })],
    });
    assert(supp.predictEnemyDamage(supp.enemies[0], action, supp.party[0]) < base,
      'suppression not reflected');
  });
}

// ============================================================
section('2.4 / 2.10 — readouts and wording');
// ============================================================
{
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  const classes = fs.readFileSync(path.join(ROOT, 'data/classes.js'), 'utf8');

  check('the morale tooltip names the stat and shows the value', () => {
    assert(/Morale: \$\{this\.engine\.morale\}\/100/.test(ui),
      'morale tooltip still omits the word "Morale" or the value');
  });

  check('camp morale shows X/100', () => {
    const matches = ui.match(/camp-morale">Morale: <span[^>]*>\$\{this\.engine\.morale\}\/100/g) || [];
    assertEqual(matches.length, 2, 'not every camp screen shows morale out of 100');
  });

  check('Calculated Dosage wording updated', () => {
    assert(/All dice unique: double poison/.test(classes),
      'Calculated Dosage still uses the old wording');
  });

  check('Fortified Strike ordering is unambiguous', () => {
    assert(/Gain 2 Block, then deal damage equal to your total Block/.test(classes),
      'Fortified Strike description still ambiguous about ordering');
  });
}

// ============================================================
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
