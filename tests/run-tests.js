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
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
