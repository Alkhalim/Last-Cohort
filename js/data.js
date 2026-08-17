// ============================================================
// Last Cohort – Game Data (loads from JSON files)
// ============================================================

// --- Skill cost types ---
const COST = {
  threshold: (min) => ({ type: 'threshold', min, dice: 1, label: `${min}+` }),
  range: (min, max) => ({ type: 'range', min, max, dice: 1, label: `${min}-${max}` }),
  exact: (val) => ({ type: 'exact', val, dice: 1, label: `=${val}` }),
  any: () => ({ type: 'any', dice: 1, label: 'Any' }),
  even: () => ({ type: 'even', dice: 1, label: 'Even' }),
  odd: () => ({ type: 'odd', dice: 1, label: 'Odd' }),
  combined: (min, count = 2) => ({ type: 'combined', min, dice: count, label: `${count}d ${min}+` }),
  combinedExact: (val, count = 2) => ({ type: 'combinedExact', val, dice: count, label: `${count}d =${val}` }),
  pair: () => ({ type: 'pair', dice: 2, label: 'Pair' }),
  pairEven: () => ({ type: 'pairEven', dice: 2, label: 'Even Pair' }),
  pairOdd: () => ({ type: 'pairOdd', dice: 2, label: 'Odd Pair' }),
  oddEven: () => ({ type: 'oddEven', dice: 2, label: 'Odd+Even' }),
  consecutive: () => ({ type: 'consecutive', dice: 2, label: 'Consecutive' }),
  pairExact6: () => ({ type: 'pairExact6', dice: 2, label: 'Two 6s' }),
};

// --- Target types ---
const TARGET = {
  SINGLE_ENEMY: 'single_enemy',
  DUAL_ENEMY: 'dual_enemy',
  RANDOM_ENEMY: 'random_enemy',
  ALL_ENEMIES: 'all_enemies',
  FRONT_ROW: 'front_row',
  SELF: 'self',
  SINGLE_ALLY: 'single_ally',
  ALL_ALLIES: 'all_allies',
};

// --- Runtime data containers (populated by loadGameData) ---
let CLASS_DATA = {};
let ENEMY_DATA = {};
let ITEM_DATA = {};
let EVENT_DATA = [];
let ENCOUNTERS = [];
let BOSS_ENCOUNTERS = [];
let MORALE_BANDS = [];
let EQUIP_SLOTS = {};
let BOSS_DROP_POOL = [];
let DROP_TABLES = {};
let BASE_DICE_COUNT = 4;

// Raw JSON data for encounter generation
let _encounterThreatData = {};

// --- Build a COST object from JSON cost data ---
function buildCost(costData) {
  switch (costData.type) {
    case 'any':
      return COST.any();
    case 'threshold':
      return COST.threshold(costData.min);
    case 'range':
      return COST.range(costData.min, costData.max);
    case 'exact':
      return COST.exact(costData.val);
    case 'combined':
      return COST.combined(costData.min, costData.dice || 2);
    case 'combinedExact':
      return COST.combinedExact(costData.val, costData.dice || 2);
    case 'pair':
      return COST.pair();
    case 'even':
      return COST.even();
    case 'odd':
      return COST.odd();
    case 'pairEven':
      return COST.pairEven();
    case 'pairOdd':
      return COST.pairOdd();
    case 'oddEven':
      return COST.oddEven();
    case 'consecutive':
      return COST.consecutive();
    case 'pairExact6':
      return COST.pairExact6();
    default:
      return COST.any();
  }
}

// --- Build an execute function from skill effect data ---
// Deep-clone a skill's effects block so each unit owns its own copy.
// Effects are plain data (numbers, booleans, and small nested objects such as
// buffAllies), so a structural clone is sufficient and keeps run-scoped upgrades
// from leaking back into CLASS_DATA. See cloneSkillForUnit below.
function cloneSkillEffects(effects) {
  if (!effects) return {};
  const copy = {};
  for (const [key, val] of Object.entries(effects)) {
    copy[key] = (val && typeof val === 'object') ? { ...val } : val;
  }
  return copy;
}

// Build a unit-owned copy of a skill: its own effects object, and an execute
// closure that reads from that object rather than the shared class definition.
function cloneSkillForUnit(skill) {
  return { ...skill, effects: cloneSkillEffects(skill.effects) };
}

function buildSkillExecute(skillData) {
  const sharedEffects = skillData.effects;
  const passiveTrigger = skillData.passiveTrigger;

  // effectsOverride lets a unit pass its own cloned effects block, so per-run
  // skill upgrades apply to that unit only. Falls back to the shared definition.
  return function execute(unit, targets, dice, effectsOverride) {
    const effects = effectsOverride || sharedEffects;
    const result = {};
    // Die value scaling: add die value(s) to base damage or block
    const dieTotal = dice.reduce((s, d) => s + (d ? d.value : 0), 0);

    // Die-scale factor: equipment bonuses scale with die value (softened curve)
    // A die of 3 is baseline (1x), die of 1 = 0.33x, die of 6 = 1.4x (was 2x)
    if (effects.dieScaleDamage || effects.dieScaleBlock || effects.dieScaleHeal) {
      const rawScale = dieTotal / 3;
      result._dieScaleFactor = rawScale <= 1 ? rawScale : 1 + (rawScale - 1) * 0.7;
    }

    // Damage (single target or dual targets)
    if (effects.damage !== undefined) {
      const dmg = effects.damage + (effects.dieScaleDamage ? dieTotal : 0);
      if (targets.length >= 2) {
        if (effects.splitDamage) result.splitDamage = true;
        result.damage = dmg;
        result.baseDamage = dmg;
        result.target = targets[0];
        result.secondTarget = targets[1];
      } else {
        result.damage = dmg;
        result.baseDamage = dmg;
        if (targets[0]) result.target = targets[0];
      }
    }

    // Heal (single target)
    if (effects.heal !== undefined) {
      const healAmt = effects.heal + (effects.dieScaleHeal ? dieTotal : 0);
      result.heal = healAmt;
      result.baseHeal = healAmt;
      if (targets[0]) result.target = targets[0];
    }

    // Heal all allies
    if (effects.healAll !== undefined) {
      result.healAll = effects.healAll;
      result.baseHeal = effects.healAll;
    }

    // Block (self — but don't override target if damage already set it to an enemy)
    if (effects.block !== undefined) {
      let block = effects.block + (effects.dieScaleBlock ? dieTotal : 0);
      if (passiveTrigger) {
        if (dice[0] && dice[0].value >= passiveTrigger.dieMin && !unit.passiveTriggered) {
          block += passiveTrigger.bonusBlock;
          unit.passiveTriggered = true;
        }
      }
      result.block = block;
      // Block goes to self unless there's a heal target (then block goes to heal target)
      result.blockTarget = result.heal ? (result.target || unit) : unit;
      if (!result.target) result.target = unit;
    }

    // Block all allies
    if (effects.blockAll !== undefined) {
      result.blockAll = effects.blockAll;
    }

    // Taunt
    if (effects.taunt) {
      result.taunt = true;
      // If block was set, target is already unit; otherwise set it
      if (result.target === undefined) result.target = unit;
    }

    // Poison (single target)
    if (effects.poison !== undefined) {
      result.poison = effects.poison;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Poison all enemies
    if (effects.poisonAll !== undefined) {
      result.poisonAll = effects.poisonAll;
    }

    // Morale
    if (effects.morale !== undefined) {
      result.morale = effects.morale;
    }

    // Buff allies
    if (effects.buffAllies !== undefined) {
      result.buffAllies = {
        bonusDamage: effects.buffAllies.bonusDamage,
        attacks: effects.buffAllies.attacks || 1,
      };
    }

    // Self damage
    if (effects.selfDamage !== undefined) {
      result.selfDamage = effects.selfDamage;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Cleanse
    if (effects.cleanse) {
      result.cleanse = true;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Ignore row (for result object, skill-level ignoreRow is separate)
    if (effects.ignoreRow) {
      result.ignoreRow = true;
    }

    // Damage all enemies (AoE damage)
    if (effects.damageAll !== undefined) {
      result.damageAll = effects.damageAll;
    }

    // Pierce block (ignore X block on target)
    if (effects.pierceBlock !== undefined) {
      result.pierceBlock = effects.pierceBlock;
    }

    // Splash: half damage to other enemies
    if (effects.splashHalf) {
      result.splashHalf = true;
    }

    // Poison splash: apply X poison to all other enemies
    if (effects.poisonSplash !== undefined) {
      result.poisonSplash = effects.poisonSplash;
    }

    // Splash: damage to all enemies in same row as target
    if (effects.splashRow) {
      result.splashRow = true;
    }

    // Pierce row: damage passes through to all enemies in the OTHER row
    if (effects.pierceRow) {
      result.pierceRow = true;
    }

    // Splash adjacent: deal X damage to enemies directly beside the target
    if (effects.splashAdjacent !== undefined) {
      result.splashAdjacent = effects.splashAdjacent;
    }

    // Splash adjacent percentage: deal X% of total damage to adjacent enemies (min 2)
    if (effects.splashAdjacentPct !== undefined) {
      result.splashAdjacentPct = effects.splashAdjacentPct;
    }

    // Splash back row: half damage pierces to all back-row enemies
    if (effects.splashBackRow) {
      result.splashBackRow = true;
    }

    // Execute: double damage to enemies below 25% HP
    if (effects.execute) {
      result.execute = true;
    }

    // Mark Target: +20% damage from all sources next turn
    if (effects.markTarget) {
      result.markTarget = true;
    }

    // Knockback: shove front-row enemy to back row
    if (effects.knockback) {
      result.knockback = true;
    }

    // Counter Stance: retaliatory damage when hit
    if (effects.counterStance) result.counterStance = effects.counterStance;

    // Shieldbreak: remove all block from target
    if (effects.shieldbreak) result.shieldbreak = true;

    // Overwatch: damage next attacker
    if (effects.overwatch) result.overwatch = effects.overwatch;

    // Suppress: target deals less damage
    if (effects.suppress) {
      result.suppress = effects.suppress;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Stimulant: target acts again
    if (effects.stimulant) result.stimulant = true;

    // Transfusion: transfer HP
    if (effects.transfusion) result.transfusion = effects.transfusion;

    // Cripple: target deals less damage per action
    if (effects.cripple) result.cripple = effects.cripple;

    // Snare Trap: trap on enemy
    if (effects.snareTrap) {
      result.snareTrap = effects.snareTrap;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Revive: bring back downed ally
    if (effects.revive) result.revive = true;

    // Morale Cost: spend morale
    if (effects.moraleCost) result.moraleCost = effects.moraleCost;

    // Deafen: nullify morale attacks
    if (effects.deafen) result.deafen = effects.deafen;

    // Deafen All: all enemies' morale attacks nullified
    if (effects.deafenAll) result.deafenAll = effects.deafenAll;

    // Resonance: double next heal
    if (effects.resonance) result.resonance = true;

    // Pull to Front: move enemy to front row
    if (effects.pullToFront) result.pullToFront = true;

    // Damage Shield: reduce incoming damage
    if (effects.damageShield) result.damageShield = effects.damageShield;

    // Smoke Screen: chance to miss
    if (effects.smokeScreen) result.smokeScreen = effects.smokeScreen;

    // Intercept: take hit for ally
    if (effects.intercept) result.intercept = true;

    // Morale Scaling: damage scales with morale (up to 2.5x at 100)
    if (effects.moraleScaling) result.moraleScaling = true;

    // Avenger's Oath: bonus damage if ally downed
    if (effects.avengeDamage) result.avengeDamage = effects.avengeDamage;

    // Shoulder Charge: knockback + bonus damage if already back row
    if (effects.shoulderCharge) result.shoulderCharge = true;

    // Echo on Kill: chain damage to another enemy if target dies
    if (effects.echoOnKill) result.echoOnKill = effects.echoOnKill;

    // Warhorse Kick: stun target + random other front-row enemy
    if (effects.warhorseKick) {
      result.warhorseKick = true;
      if (targets[0] && !result.target) result.target = targets[0];
    }

    // Condemn: target takes +30% damage from all sources
    if (effects.condemn) result.condemn = effects.condemn;

    // Shieldbreak All: remove all block from all enemies
    if (effects.shieldbreakAll) result.shieldbreakAll = true;

    // Block others only: blockAll skips the caster
    if (effects.blockOthersOnly) result.blockOthersOnly = true;

    // Morale Heal All: heal all allies if morale is 50+
    if (effects.moraleHealAll) result.moraleHealAll = effects.moraleHealAll;

    // Double Poison: doubles poison if target already poisoned
    if (effects.doublePoison) result.doublePoison = true;
    if (effects.triplePoison) result.triplePoison = true;

    // Kill Shot: double damage to marked or poisoned targets
    if (effects.killShot) result.killShot = true;

    // Caltrops: mark + snare trap on target and adjacent front-row enemies
    if (effects.caltrops) result.caltrops = effects.caltrops;

    // Buff Self: buff only the caster
    if (effects.buffSelf) result.buffSelf = {
      bonusDamage: effects.buffSelf.bonusDamage,
      attacks: effects.buffSelf.attacks || 1,
    };

    // Buff Target: buff the targeted ally
    if (effects.buffTarget) result.buffTarget = {
      bonusDamage: effects.buffTarget.bonusDamage,
      attacks: effects.buffTarget.attacks || 1,
    };

    // Stun: stun target next turn
    if (effects.stun) result.stun = true;

    // Overrun: bonus damage per matching die in the roll
    if (effects.overrun) result.overrun = true;

    // Half-scaled self damage (scales with half of equipDamage)
    if (effects.halfScaleSelfDamage) result.halfScaleSelfDamage = true;

    // Half bonus damage on AoE
    if (effects.halfBonusDmg) result.halfBonusDmg = true;

    // Custom bonus damage scaling (e.g. 1.5x)
    if (effects.bonusDmgScale) result.bonusDmgScale = effects.bonusDmgScale;
    // Custom bonus poison scaling for main target and splash
    if (effects.bonusPoisonScale) result.bonusPoisonScale = effects.bonusPoisonScale;
    if (effects.splashPoisonScale) result.splashPoisonScale = effects.splashPoisonScale;

    // Consume all damage buffs after dealing damage
    if (effects.consumeAllBuffs) result.consumeAllBuffs = true;

    // New mechanics
    if (effects.fortifiedStrike) result.fortifiedStrike = true;
    if (effects.gladiusThrust) result.gladiusThrust = true;
    if (effects.aimedShot) result.aimedShot = true;
    if (effects.marchTempo) result.marchTempo = true;
    if (effects.momentumStrike) { result.momentumStrike = true; if (targets[0]) result.target = targets[0]; }
    if (effects.breakneckCharge) { result.breakneckCharge = true; if (targets[0]) result.target = targets[0]; }
    if (effects.allInCharge) { result.allInCharge = true; if (targets[0]) result.target = targets[0]; }
    if (effects.cleanseMarks) result.cleanseMarks = true;
    if (effects.cleanseStun) result.cleanseStun = true;
    if (effects.precisionDrill) {
      result.precisionDrill = true;
      if (targets[0]) result.target = targets[0];
    }
    if (effects.bonusDiceNext) result.bonusDiceNext = effects.bonusDiceNext;
    if (effects.cleanseAll) result.cleanseAll = true;
    if (effects.triageStrike) result.triageStrike = effects.triageStrike;
    if (effects.calculatedDosage) {
      result.calculatedDosage = true;
      if (targets[0] && !result.target) result.target = targets[0];
    }
    if (effects.trickShot) result.trickShot = true;
    if (effects.wildernessInstinct) result.wildernessInstinct = true;
    if (effects.fortunesFavor) result.fortunesFavor = true;
    if (effects.freeAction) result.freeAction = true;
    if (effects.harmonicFrequency) result.harmonicFrequency = true;
    if (effects.flankingStrike) result.flankingStrike = true;
    if (effects.scoutingManeuver) result.scoutingManeuver = true;
    if (effects.healSelf) result.healSelf = effects.healSelf;
    if (effects.skipNextTurn) result.skipNextTurn = true;
    if (effects.imperialDecree) result.imperialDecree = true;
    if (effects.lastStand) result.lastStand = true;
    if (effects.blockScale) result.blockScale = effects.blockScale;
    if (effects.shieldBrace) result.shieldBrace = true;
    if (effects.rallyingTrumpet) result.rallyingTrumpet = effects.rallyingTrumpet;
    if (effects.noKillMorale) result.noKillMorale = true;

    // New class mechanics
    if (effects.herbPoulticePoison) result.herbPoulticePoison = true;
    if (effects.wolfbite) result.wolfbite = true;
    if (effects.shieldWallDance) result.shieldWallDance = true;
    if (effects.predatorsPounce) result.predatorsPounce = true;
    if (effects.bonusHealScale) result.bonusHealScale = effects.bonusHealScale;
    if (effects.flameTouch) result.flameTouch = true;
    if (effects.vestasJudgment) result.vestasJudgment = true;
    if (effects.divineIntercession) result.divineIntercession = effects.divineIntercession;
    if (effects.litanyOfCourage) result.litanyOfCourage = true;
    if (effects.flameShield) result.flameShield = true;
    if (effects.wrathOfVesta) result.wrathOfVesta = true;
    if (effects.resurrectionPrayer) result.resurrectionPrayer = true;
    if (effects.lacedBlade) result.lacedBlade = true;
    if (effects.misdirection) {
      result.misdirection = true;
      if (targets[0]) result.target = targets[0];
    }
    if (effects.deadDrop) result.deadDrop = true;
    if (effects.shadowNetwork) result.shadowNetwork = true;
    if (effects.assassination) result.assassination = true;
    if (effects.contingencyPlan) result.contingencyPlan = true;
    if (effects.deepCover) result.deepCover = true;
    if (effects.mountedSweep) result.mountedSweep = true;
    if (effects.armoredAdvance) result.armoredAdvance = true;
    if (effects.destriersFury) result.destriersFury = true;
    if (effects.cataphractsDoom) result.cataphractsDoom = true;

    return result;
  };
}

// --- Build a complete skill object from JSON skill data ---
function buildSkill(skillData) {
  const skill = {
    id: skillData.id,
    name: skillData.name,
    cost: buildCost(skillData.cost),
    target: skillData.target,
    description: skillData.description,
    execute: buildSkillExecute(skillData),
    effects: skillData.effects || {},
  };
  if (skillData.starter) skill.starter = true;
  if (skillData.cooldown) skill.cooldown = skillData.cooldown;
  if (skillData.ignoreRow) skill.ignoreRow = true;
  if (skillData.targetOthers) skill.targetOthers = true;
  return skill;
}

// --- Build CLASS_DATA from JSON ---
function buildClassData(rawClasses) {
  const result = {};
  for (const [classId, rawClass] of Object.entries(rawClasses)) {
    result[classId] = {
      name: rawClass.name,
      title: rawClass.title,
      maxHp: rawClass.maxHp,
      tags: rawClass.tags,
      description: rawClass.description,
      passive: { ...rawClass.passive },
      skills: rawClass.skills.map(s => buildSkill(s)),
      equipSlots: rawClass.equipSlots || { weapon: 2, armor: 2, trinket: 3 },
      complexity: rawClass.complexity || 1,
    };
    if (rawClass.hidden) result[classId].hidden = true;
    if (rawClass.unlockCondition) result[classId].unlockCondition = rawClass.unlockCondition;
    if (rawClass.unlockKey) result[classId].unlockKey = rawClass.unlockKey;
  }
  return result;
}

// --- Build DROP_TABLES from JSON, resolving boss pool references ---
function buildDropTables(rawDropTables, bossPool) {
  const result = {};
  for (const [enemyId, rawTable] of Object.entries(rawDropTables)) {
    result[enemyId] = {
      nothingChance: rawTable.nothingChance,
      tiers: rawTable.tiers.map(tier => ({
        chance: tier.chance,
        items: tier.items === '__BOSS_DROP_POOL__' ? bossPool : tier.items,
        minDifficulty: tier.minDifficulty || 0,
      })),
    };
  }
  return result;
}

// --- Load all game data from embedded globals (gamedata.js) ---
function loadGameData() {
  // Build runtime data
  CLASS_DATA = buildClassData(RAW_CLASSES);
  ENEMY_DATA = RAW_ENEMIES;
  ITEM_DATA = RAW_ITEMS;
  EVENT_DATA = RAW_EVENTS;

  // Config
  MORALE_BANDS = RAW_CONFIG.moraleBands;
  EQUIP_SLOTS = RAW_CONFIG.equipSlots;
  BOSS_DROP_POOL = RAW_CONFIG.bossDropPool;
  BASE_DICE_COUNT = RAW_CONFIG.baseDiceCount;

  // Encounters
  ENCOUNTERS = RAW_ENCOUNTERS.templates;
  BOSS_ENCOUNTERS = RAW_ENCOUNTERS.bossEncounters;
  _encounterThreatData = RAW_ENCOUNTERS.threatLevels;

  // Drop tables (resolve boss pool references)
  DROP_TABLES = buildDropTables(RAW_ENCOUNTERS.dropTables, BOSS_DROP_POOL);

  // Item and drop-tier difficulty gates were authored on the old 8-march
  // scale. Runs are now FINAL_MARCH slots long; items and drops are
  // progression, so their gates follow the run's slots. Encounter, enemy and
  // event gates are NOT remapped — those numbers are content keys that
  // regions translate via contentDiff.
  for (const item of Object.values(ITEM_DATA)) {
    if (item.minDifficulty) item.minDifficulty = contentToSlotGate(item.minDifficulty);
    if (item.maxDifficulty) item.maxDifficulty = contentToSlotGate(item.maxDifficulty);
  }
  for (const table of Object.values(DROP_TABLES)) {
    for (const tier of table.tiers) {
      if (tier.minDifficulty) tier.minDifficulty = contentToSlotGate(tier.minDifficulty);
    }
  }
}

// --- Encounter generation by threat level ---
let _lastEncounterName = null;

function pickEncounterAvoidRepeat(pool) {
  if (pool.length === 0) return null;
  const filtered = pool.filter(e => e.name !== _lastEncounterName);
  const chosen = (filtered.length > 0 ? filtered : pool)[Math.floor(Math.random() * (filtered.length > 0 ? filtered : pool).length)];
  _lastEncounterName = chosen.name;
  return chosen;
}

function generateEncounterByThreat(threat, difficulty) {
  const diff = difficulty || 1;
  const filterByDiff = (list) => list.filter(e => {
    if (e.minDifficulty && e.minDifficulty > diff) return false;
    if (e.maxDifficulty && e.maxDifficulty < diff) return false;
    return true;
  });
  if (threat <= 1 && diff <= 3) {
    return pickEncounterAvoidRepeat(filterByDiff(_encounterThreatData.easy));
  } else if (threat <= 1 && diff > 3) {
    return pickEncounterAvoidRepeat(filterByDiff(_encounterThreatData.mid));
  } else if (threat === 2) {
    return pickEncounterAvoidRepeat(filterByDiff(_encounterThreatData.mid));
  } else {
    return pickEncounterAvoidRepeat(filterByDiff(_encounterThreatData.hard));
  }
}

// ============================================================
// Marches: regions and the per-run route
//
// A run is FINAL_MARCH marches long. The REGION decides WHAT you fight —
// encounter pools, intro tables, event flavor. The SLOT (1..FINAL_MARCH)
// decides HOW STRONG it is — every stat-scaling formula keys off the slot.
//
// contentDiff maps a region onto the difficulty numbers the data tables were
// authored with (the old 10-march numbering, offset by one from march 3 on).
// The four late regions carry an explicit encounter-name pool instead,
// because their old numbers collide: haunted and heart both sat at 7,
// drowned and threshold both at 8.
// ============================================================
const FINAL_MARCH = 6;

// Old 8-march difficulty gate → slot gate on the 6-march scale.
function contentToSlotGate(d) {
  return Math.max(1, Math.ceil(d * FINAL_MARCH / 8));
}

const STORY_BOSS_NAMES = ['Corpse of Arminius', 'Corpse of Varus', 'Spirits of Arminius & Varus'];

const REGIONS = {
  ambush_trail: {
    name: 'The Ambush Trail', subtitle: 'The forest closes behind you.',
    theme: 'forest', music: 'assets/Cohort Defiant.mp3',
    introKey: '1', contentDiff: 1,
  },
  hunting_grounds: {
    name: 'The Hunting Grounds', subtitle: 'They know these woods. You do not.',
    theme: 'forest-dark', music: 'assets/Hunters in the Canopy.mp3',
    introKey: '2', contentDiff: 2,
  },
  poisoned_bog: {
    name: 'The Poisoned Bog', subtitle: 'The ground turns to black water.',
    theme: 'bog', music: 'assets/Black Mire Pulse.mp3',
    introKey: '4', contentDiff: 4,
  },
  old_forest: {
    name: 'The Old Forest', subtitle: 'Ancient things stir between the roots.',
    theme: 'ancient', music: 'assets/Roots Remember Blood.mp3',
    introKey: '5', contentDiff: 5,
  },
  blood_grove: {
    name: 'The Blood Grove', subtitle: 'Altars stained red. The druids watch.',
    theme: 'blood', music: 'assets/Crimson Ritual.mp3',
    introKey: '6', contentDiff: 6,
  },
  drowned_vale: {
    name: 'The Drowned Vale', subtitle: 'The water remembers the drowned.',
    theme: 'bog', music: 'assets/Black Mire Pulse.mp3',
    introKey: '8', contentDiff: 8,
    pool: ['Sunken Court', 'Drowned Wardens', "Warden's Stand", 'Toxic Shallows',
           'Swamp Horror', 'Forest Fortress', 'Root Guardians', 'The Old Growth',
           'Plague Pit', 'Leech Swarm'],
  },
  haunted_march: {
    name: 'The Haunted March', subtitle: 'The dead walk in Roman formation.',
    theme: 'haunted', music: 'assets/Eagle of the Unremembered.mp3',
    introKey: '7', contentDiff: 7,
    pool: ['The Haunted Trail', 'The Fallen Century', 'Cavalry Ghost',
           "The Officer's Grave", 'Spectral Patrol', 'Dead Legion', 'Bone Court',
           'Cursed Patrol', 'The Broken Standard', 'The Last Muster',
           'Carrion Watch', 'Grave Escort', 'Procession of the Dead'],
  },
  heart_forest: {
    name: 'The Heart of the Forest', subtitle: 'The trees are flesh. The ground pulses.',
    theme: 'heart', music: 'assets/Root-Rot Cathedral.mp3',
    introKey: '9', contentDiff: 7,
    pool: ['The Living Wall', 'Fungal Bloom', 'The Rotting Core', 'The Thorn Canopy',
           'Heart Guardians', 'Blood Circle', 'Altar Guard', 'Ritual Warband'],
  },
  threshold: {
    name: 'The Threshold', subtitle: 'Between worlds. The spirits await.',
    theme: 'threshold', music: 'assets/Spirits at the Teutoburg Gate.mp3',
    introKey: '10', contentDiff: 8,
    pool: ['Threshold Guardians', 'The Last Veil', 'Ghost Pack', 'Woven Doom',
           "The Elder's Court", 'Sunken Court', 'Drowned Wardens', "Warden's Stand"],
  },
};

// Route: slot 1 and the finale are fixed; everything between is drawn so that
// every run skips one early, one mid and one late region. lastRoute biases the
// draw toward regions the previous run skipped.
function generateRoute(lastRoute) {
  const last = Array.isArray(lastRoute) ? lastRoute : [];
  const pick = (options, avoid) => {
    let pool = options.filter(o => o !== avoid);
    if (pool.length === 0) pool = options;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  const route = ['ambush_trail'];
  route.push(pick(['hunting_grounds', 'poisoned_bog'], last[1]));
  const midOptions = ['old_forest', 'blood_grove', 'drowned_vale'];
  const skippedLast = last.length ? midOptions.find(r => !last.includes(r)) : null;
  const first = skippedLast || pick(midOptions);
  const second = pick(midOptions.filter(r => r !== first));
  if (Math.random() < 0.5) route.push(first, second); else route.push(second, first);
  route.push(pick(['haunted_march', 'heart_forest'], last[4]));
  route.push('threshold');
  return route;
}

// Region-aware encounter generation. Curated regions draw from their named
// pool; the rest reuse the threat tiers at the region's contentDiff.
function generateEncounterForRegion(regionId, threat, difficulty) {
  const region = REGIONS[regionId];
  if (!region) return generateEncounterByThreat(threat, difficulty);
  if (region.pool) {
    const all = [..._encounterThreatData.easy, ..._encounterThreatData.mid, ..._encounterThreatData.hard];
    const pool = region.pool
      .map(name => all.find(e => e.name === name))
      .filter(Boolean);
    if (pool.length > 0) return pickEncounterAvoidRepeat(pool);
  }
  return generateEncounterByThreat(threat, region.contentDiff);
}

// --- Morale helpers ---
function getMoraleBand(morale) {
  for (const band of MORALE_BANDS) {
    if (morale >= band.min) return band;
  }
  return MORALE_BANDS[MORALE_BANDS.length - 1];
}

// --- canEquipItem helper ---
function canEquipItem(unit, item) {
  // All units implicitly have the "roman" tag — except Germanic units (e.g. Wulfswestr)
  const unitTags = CLASS_DATA[unit.classId].tags;
  const isGermanic = unitTags.includes('germanic');
  return item.classTags.some(tag => {
    if (tag === 'roman') return !isGermanic;
    return unitTags.includes(tag);
  });
}

// --- Get all item base IDs currently owned by the party ---
function getOwnedItemBaseIds(party) {
  const owned = new Set();
  if (!party) return owned;
  party.forEach(u => {
    for (const slot of ['weapon', 'armor', 'trinket']) {
      u.equipment[slot].forEach(id => {
        if (!id) return;
        const item = ITEM_DATA[id];
        owned.add(item && item.baseId ? item.baseId : id);
      });
    }
  });
  return owned;
}

// --- Drop / loot helpers ---
function rollDrop(enemyId, party, difficulty) {
  const table = DROP_TABLES[enemyId];
  if (!table) return null;
  const diff = difficulty || (window.game && window.game.difficulty) || 1;
  // Curse: Rare Collector — uncommon/rare items drop 30% less
  const rareCollectorActive = window.game && window.game.activeCurses && window.game.activeCurses.includes('rare_collector');
  const roll = Math.random();
  let cumulative = table.nothingChance;
  if (roll < cumulative) return null;
  for (const tier of table.tiers) {
    // Skip tiers locked behind higher difficulty
    if (tier.minDifficulty && diff < tier.minDifficulty) continue;
    cumulative += tier.chance;
    if (roll < cumulative) {
      let candidates = tier.items;
      // Filter out items locked behind higher difficulty
      candidates = candidates.filter(itemId => {
        const item = ITEM_DATA[itemId];
        if (!item) return true;
        if (item.minDifficulty && item.minDifficulty > diff) return false;
        if (item.maxDifficulty && item.maxDifficulty < diff) return false;
        return true;
      });
      if (candidates.length === 0) candidates = tier.items.filter(itemId => {
        const item = ITEM_DATA[itemId];
        return !item || !item.minDifficulty || item.minDifficulty <= diff;
      });
      if (candidates.length === 0) return null;
      // Boost items new to this march (minDifficulty === current difficulty)
      // They get 2x weight in the random selection
      const weighted = [];
      candidates.forEach(itemId => {
        const item = ITEM_DATA[itemId];
        const isNew = item && item.minDifficulty && item.minDifficulty === diff;
        weighted.push(itemId);
        if (isNew) weighted.push(itemId); // double chance
      });
      // Duplicate filtering: avoid dropping items the party already owns
      const ownedIds = getOwnedItemBaseIds(party);
      if (diff <= 1) {
        // Stage 1: never drop an item the party already has
        const noDupes = weighted.filter(id => !ownedIds.has(id));
        if (noDupes.length > 0) {
          weighted.length = 0;
          noDupes.forEach(id => weighted.push(id));
        }
      } else {
        // Stage 2+: prefer items not already owned (3x weight for non-owned)
        const boosted = [];
        weighted.forEach(id => {
          boosted.push(id);
          if (!ownedIds.has(id)) { boosted.push(id); boosted.push(id); }
        });
        weighted.length = 0;
        boosted.forEach(id => weighted.push(id));
      }
      // Smart drop filtering: reduce chance if slot is full on all eligible characters
      if (party && party.length > 0) {
        let filtered = weighted.filter(itemId => {
          const item = ITEM_DATA[itemId];
          if (!item) return true;
          const eligible = party.filter(u => canEquipItem(u, item));
          if (eligible.length === 0) return false;
          const allFull = eligible.every(u => {
            const slots = u.equipment[item.slot];
            return slots.every(s => s !== null);
          });
          if (allFull) {
            return Math.random() > 0.6;
          }
          return true;
        });
        if (filtered.length === 0) filtered = weighted;
        const picked = filtered[Math.floor(Math.random() * filtered.length)];
        // Curse: Rare Collector — 30% chance to nullify uncommon/rare drops
        if (rareCollectorActive && picked) {
          const pickedItem = ITEM_DATA[picked];
          if (pickedItem && (pickedItem.rarity === 'uncommon' || pickedItem.rarity === 'rare')) {
            if (Math.random() < 0.3) return null;
          }
        }
        return picked;
      }
      const picked = weighted[Math.floor(Math.random() * weighted.length)];
      if (rareCollectorActive && picked) {
        const pickedItem = ITEM_DATA[picked];
        if (pickedItem && (pickedItem.rarity === 'uncommon' || pickedItem.rarity === 'rare')) {
          if (Math.random() < 0.3) return null;
        }
      }
      return picked;
    }
  }
  return null;
}

function getItemData(itemId) {
  return ITEM_DATA[itemId] || null;
}

// Returns display name for an item: base name + Lv suffix if leveled
function getItemDisplayName(itemId) {
  const item = ITEM_DATA[itemId];
  if (!item) return itemId;
  const level = item.level || 1;
  // Get the clean base name (from the base item if it exists, otherwise strip any +N suffixes)
  let baseName = item.name;
  if (item.baseId && ITEM_DATA[item.baseId]) {
    baseName = ITEM_DATA[item.baseId].name;
  }
  // Strip any existing +N or LvN suffixes from the name
  baseName = baseName.replace(/\s*(\+\d+\s*)+/g, '').replace(/\s*Lv\d+/g, '').trim();
  if (level <= 1) return baseName;
  return baseName + ' Lv' + level;
}

// Returns the primary (non-roman) tag for a class, for color coding
function getPrimaryTag(classId) {
  const tags = CLASS_DATA[classId] ? CLASS_DATA[classId].tags : [];
  return tags.find(t => t !== 'roman') || tags[0] || 'roman';
}

// Returns dual-color HTML for hybrid class names
function renderClassName(classId, name) {
  const tags = CLASS_DATA[classId] ? CLASS_DATA[classId].tags : [];
  const displayTags = tags.filter(t => t !== 'roman' && t !== 'germanic');
  if (displayTags.length >= 2) {
    const mid = Math.ceil(name.length / 2);
    const first = name.slice(0, mid);
    const second = name.slice(mid);
    return `<span style="color:var(--class-${displayTags[0]})">${first}</span><span style="color:var(--class-${displayTags[1]})">${second}</span>`;
  }
  const tag = displayTags[0] || 'roman';
  return `<span style="color:var(--class-${tag})">${name}</span>`;
}

// Returns tag pip HTML for an item's classTags
function renderTagPips(classTags) {
  // Hide "roman" tag when there are other tags (avoid empty grey dot)
  const nonRoman = classTags.filter(t => t !== 'roman');
  const tagsToShow = nonRoman.length > 0 ? nonRoman : classTags;
  return tagsToShow.map(t => `<span class="tag-pip tag-${t}"></span>`).join('');
}

// Create a leveled copy of an item — each level adds +1 to a random positive stat
// extraDice is deliberately never scaled — +1 die per level would be absurd.
// An item whose only stat is extraDice therefore has nowhere to put its bonus
// levels, so leveling it produces an instance identical to the base item.
// Runic Stone was exactly this case: a Lv5 was byte-identical to a Lv1.
function itemHasScalableStat(item) {
  if (!item || !item.stats) return false;
  return Object.keys(item.stats).some(k => k !== 'extraDice' && item.stats[k] !== 0);
}

function createLeveledItem(itemId, bonusLevels) {
  const base = ITEM_DATA[itemId];
  if (!base || bonusLevels <= 0) return itemId; // return plain ID if no scaling
  // Don't mint a fake leveled instance that can never differ from the base.
  if (!itemHasScalableStat(base)) return itemId;

  // Create a unique instance ID
  const instanceId = itemId + '_lv' + (1 + bonusLevels) + '_' + Math.random().toString(36).substr(2, 4);

  // Deep clone the item
  const leveled = JSON.parse(JSON.stringify(base));
  leveled.id = instanceId;
  leveled.baseId = itemId;
  leveled.level = 1 + bonusLevels;

  // Apply bonus levels — distribute proportionally to preserve item identity
  // Each level goes to the stat with the highest original weight (with randomness for ties)
  const positiveKeys = Object.keys(leveled.stats).filter(k => k !== 'extraDice' && leveled.stats[k] > 0);
  const negKeys = Object.keys(leveled.stats).filter(k => k !== 'extraDice' && leveled.stats[k] < 0);

  if (positiveKeys.length > 0) {
    // Build weighted pool from original stat values (higher base = more upgrades)
    const baseWeights = {};
    let totalWeight = 0;
    for (const k of positiveKeys) {
      baseWeights[k] = Math.max(1, base.stats[k] || 0);
      totalWeight += baseWeights[k];
    }

    for (let i = 0; i < bonusLevels; i++) {
      // Weighted random pick — stats with higher base values get more upgrades
      let roll = Math.random() * totalWeight;
      let chosen = positiveKeys[0];
      for (const k of positiveKeys) {
        roll -= baseWeights[k];
        if (roll <= 0) { chosen = k; break; }
      }
      leveled.stats[chosen]++;
    }
  } else if (negKeys.length > 0) {
    // No positive stats — reduce negative stats
    for (let i = 0; i < bonusLevels; i++) {
      // Pick the least negative stat
      const key = negKeys.reduce((best, k) => leveled.stats[k] > leveled.stats[best] ? k : best, negKeys[0]);
      leveled.stats[key]++;
    }
  }

  // Name stays clean — level shown separately via item.level
  leveled.name = base.name;

  // Register in ITEM_DATA so getItemData works
  ITEM_DATA[instanceId] = leveled;

  return instanceId;
}

// Scale item special text to reflect current level
const ITEM_SPECIAL_SCALING = {
  raider_shield:       { base: 6, formula: lv => 6 + (lv - 1) * 2 },
  herb_pouch:          { base: 1, formula: lv => 1 * lv },
  scouts_leather:      { base: 3, formula: lv => 3 + (lv - 1) },
  gladiators_wraps:    { base: 3, formula: lv => 3 + (lv - 1) },
  night_owl_pendant:   { base: 2, formula: lv => 2 + (lv - 1) },
  scorpio_crossbow:    { base: 5, formula: lv => 5 + (lv - 1) * 2 },
  legion_composite_bow:{ base: 1, formula: lv => 1 * lv },
  venomous_blade:      { base: 1, formula: lv => 1 * lv },
  blood_iron_gladius:  { base: 1, formula: lv => 1 * lv },
  herbalists_satchel:  { base: 1, formula: lv => 1 * lv },
  marsh_root_brew:     { base: 1, formula: lv => 1 * lv },
  crown_of_thorns:     { base: 2, formula: lv => 2 * lv },
  bitter_remedy:       { base: 1, formula: lv => 1 * lv },
  shieldbearers_grip:  { base: 2, formula: lv => 2 + (lv - 1) },
  fang_necklace:       { base: 1, formula: lv => 1 * lv },
  wolf_pelt:           { base: 3, formula: lv => 3 + (lv - 1) },
  thorn_mantle:        { base: 2, formula: lv => 2 * lv },
  corpsebloom:         { base: 2, formula: lv => 2 * lv },

  // --- Previously missing ------------------------------------------------
  // These all scale in combat.js but had no text formula, so their cards kept
  // showing level-1 numbers at every level. hound_collar is the item reported
  // as "applies more poison than it says".
  centurions_gorget:   { base: 3, formula: lv => 3 + (lv - 1) },
  champions_helm:      { base: 1, formula: lv => lv },
  chiefs_spear:        { base: 2, formula: lv => 2 + (lv - 1) },
  hound_collar:        { base: 2, formula: lv => 2 + (lv - 1) },
  legionary_lorica:    { base: 2, formula: lv => 2 * lv },
  legionary_rations:   { base: 1, formula: lv => 1 * lv },
  lorica_of_the_damned:{ base: 23, formula: lv => Math.round((0.2 + lv * 0.03) * 100) },
  oak_splinter:        { base: 2, formula: lv => 2 + (lv - 1) },
  vanguards_banner:    { base: 2, formula: lv => 2 + (lv - 1) },
  wicker_ash:          { base: 1, formula: lv => lv },
  wolf_blood_tonic:    { base: 1, formula: lv => 1 * lv },
  // Two independent numbers in one sentence.
  sword_of_germanicus: [
    { base: 3, formula: lv => 3 + (lv - 1) },
    { base: 2, formula: lv => 2 + Math.floor(lv / 2) },
  ],
};

// Rewrite an item's special text for its current level. Accepts either a single
// {base, formula} or an array of them, patched left to right — several specials
// state two independent numbers, and patching only the first left the other
// stale.
function formatItemSpecial(item) {
  if (!item.special) return '';
  const lv = item.level || 1;
  if (lv <= 1) return item.special;
  const baseId = item.baseId || item.id;
  const scaling = ITEM_SPECIAL_SCALING[baseId];
  if (!scaling) return item.special;

  const rules = Array.isArray(scaling) ? scaling : [scaling];
  let text = item.special;
  let searchFrom = 0;
  for (const rule of rules) {
    const re = new RegExp('\\b' + rule.base + '\\b');
    const rest = text.slice(searchFrom);
    const idx = rest.search(re);
    if (idx === -1) continue;
    const scaled = String(rule.formula(lv));
    const absolute = searchFrom + idx;
    // Splice from the match position, not from searchFrom — using `rest` here
    // duplicated everything between searchFrom and the number ("Kills restore
    // +Kills restore +3 extra morale.").
    text = text.slice(0, absolute) + rest.slice(idx).replace(re, scaled);
    // Continue past what we just wrote so the next rule can't re-match it.
    searchFrom = absolute + scaled.length;
  }
  return text;
}

// Poison ticks for its full value and then decays by 1, so N poison deals
// N + (N-1) + ... + 1 damage in total. Nothing in the UI said so, which is very
// likely why "+2 poison" was reported as dealing more than it claims: it deals
// 3. Used wherever a poison figure is shown.
function poisonTotalDamage(n) {
  const v = Math.max(0, Math.floor(n || 0));
  return (v * (v + 1)) / 2;
}

// --- Enemy action riders -------------------------------------------------
// Every mechanical key an enemy action can carry, and how to show it. The
// tooltip previously hardcoded nine of these, so eleven riders were invisible —
// including War Boar's Boar Charge, which stuns its target, and `cooldown`,
// which 64 actions use. Adding a rider to enemy data without adding it here
// will fail the "no unlabelled enemy action rider" test.
const ACTION_RIDER_LABELS = {
  damage:           v => v > 0 ? `<span class="stat-dmg">${v} dmg</span>` : null,
  poisonTarget:     v => `<span class="stat-poison">${v} poison</span>`,
  morale:           v => `<span class="stat-morale-text">${v} morale</span>`,
  blockAllEnemies:  v => `<span class="stat-block">+${v} block all</span>`,
  blockFrontRow:    v => `<span class="stat-block">+${v} block front</span>`,
  blockSelf:        v => `<span class="stat-block">+${v} block self</span>`,
  spawn:            () => '<span style="color:var(--gold)">spawns unit</span>',
  aoe:              () => '<span style="color:var(--red-bright)">AOE</span>',
  ignoreRow:        () => '<span style="color:var(--text-dim)">any row</span>',
  // Previously invisible:
  boarCharge:       () => '<span style="color:var(--red-bright)">STUNS target</span>',
  multiTarget:      () => '<span style="color:var(--red-bright)">hits multiple</span>',
  markTarget:       () => '<span style="color:var(--red-bright)">marks target</span>',
  weakenTarget:     () => '<span style="color:var(--red-bright)">weakens target</span>',
  pierceBlock:      () => '<span style="color:var(--red-bright)">ignores block</span>',
  runeBinding:      () => '<span style="color:var(--gold)">binds a die</span>',
  damageFromBlock:  () => '<span style="color:var(--blue-bright)">adds its block</span>',
  healAlly:         v => `<span class="stat-heal">heals ally ${v}</span>`,
  healSelf:         v => `<span class="stat-heal">heals self ${v}</span>`,
  selfDamage:       v => `<span class="stat-dmg">costs ${v} HP</span>`,
  cooldown:         v => `<span style="color:var(--text-dim)">every ${v + 1} turns</span>`,
  // Structural//internal keys that carry no player-facing meaning.
  name:             () => null,
  chance:           () => null,
  text:             () => null,
  phase:            () => null,
  toRow:            () => null,
};

// Build the detail chips for one enemy action. Shared by the bestiary tooltip
// and the next-attack preview so the two can never disagree.
function describeEnemyAction(action) {
  const details = [];
  for (const key of Object.keys(action)) {
    const fmt = ACTION_RIDER_LABELS[key];
    if (!fmt) continue;
    const val = action[key];
    if (val === undefined || val === null || val === false) continue;
    const chip = fmt(val);
    if (chip) details.push(chip);
  }
  return details;
}

function formatItemStats(stats) {
  const colors = {
    dmg: 'var(--red-bright)', block: 'var(--blue-bright)', HP: '#cc8844',
    heal: 'var(--green-bright)', poison: '#8a4', die: 'var(--gold)',
  };
  const fmt = (val, label) => {
    const sign = val > 0 ? '+' : '';
    const color = val < 0 ? 'var(--red-bright)' : (colors[label] || 'var(--text-bright)');
    return `<span style="color:${color}">${sign}${val} ${label}</span>`;
  };
  const parts = [];
  if (stats.damage) parts.push(fmt(stats.damage, 'dmg'));
  if (stats.block) parts.push(fmt(stats.block, 'block'));
  if (stats.maxHp) parts.push(fmt(stats.maxHp, 'HP'));
  if (stats.heal) parts.push(fmt(stats.heal, 'heal'));
  if (stats.poison) parts.push(fmt(stats.poison, 'poison'));
  if (stats.extraDice) parts.push(fmt(stats.extraDice, 'die'));
  return parts.join(', ');
}
