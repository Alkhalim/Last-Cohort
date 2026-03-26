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
function buildSkillExecute(skillData) {
  const effects = skillData.effects;
  const passiveTrigger = skillData.passiveTrigger;

  return function execute(unit, targets, dice) {
    const result = {};
    // Die value scaling: add die value(s) to base damage or block
    const dieTotal = dice.reduce((s, d) => s + (d ? d.value : 0), 0);

    // Die-scale factor: equipment bonuses scale with die value (dieTotal/3)
    // A die of 3 is baseline (1x), die of 1 = 0.33x, die of 6 = 2x
    if (effects.dieScaleDamage || effects.dieScaleBlock || effects.dieScaleHeal) {
      result._dieScaleFactor = dieTotal / 3;
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
}

// --- Encounter generation by threat level ---
let _lastEncounterName = null;

function generateEncounterByThreat(threat, difficulty) {
  const diff = difficulty || 1;
  const filterByDiff = (list) => list.filter(e => {
    if (e.minDifficulty && e.minDifficulty > diff) return false;
    if (e.maxDifficulty && e.maxDifficulty < diff) return false;
    return true;
  });
  const pickAvoidRepeat = (pool) => {
    if (pool.length === 0) return null;
    const filtered = pool.filter(e => e.name !== _lastEncounterName);
    const chosen = (filtered.length > 0 ? filtered : pool)[Math.floor(Math.random() * (filtered.length > 0 ? filtered : pool).length)];
    _lastEncounterName = chosen.name;
    return chosen;
  };
  if (threat <= 1 && diff <= 3) {
    return pickAvoidRepeat(filterByDiff(_encounterThreatData.easy));
  } else if (threat <= 1 && diff > 3) {
    return pickAvoidRepeat(filterByDiff(_encounterThreatData.mid));
  } else if (threat === 2) {
    return pickAvoidRepeat(filterByDiff(_encounterThreatData.mid));
  } else {
    return pickAvoidRepeat(filterByDiff(_encounterThreatData.hard));
  }
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
function createLeveledItem(itemId, bonusLevels) {
  const base = ITEM_DATA[itemId];
  if (!base || bonusLevels <= 0) return itemId; // return plain ID if no scaling

  // Create a unique instance ID
  const instanceId = itemId + '_lv' + (1 + bonusLevels) + '_' + Math.random().toString(36).substr(2, 4);

  // Deep clone the item
  const leveled = JSON.parse(JSON.stringify(base));
  leveled.id = instanceId;
  leveled.baseId = itemId;
  leveled.level = 1 + bonusLevels;

  // Apply bonus levels — each level adds +1 to a random non-negative stat
  // If no non-negative stats exist, reduce a negative stat (which may become positive)
  for (let i = 0; i < bonusLevels; i++) {
    const positiveKeys = Object.keys(leveled.stats).filter(k => k !== 'extraDice' && leveled.stats[k] >= 0);
    if (positiveKeys.length > 0) {
      const key = positiveKeys[Math.floor(Math.random() * positiveKeys.length)];
      leveled.stats[key]++;
    } else {
      // No non-negative stats — reduce a negative stat (can cross into positive)
      const negKeys = Object.keys(leveled.stats).filter(k => k !== 'extraDice' && leveled.stats[k] < 0);
      if (negKeys.length > 0) {
        const key = negKeys[Math.floor(Math.random() * negKeys.length)];
        leveled.stats[key]++;
      }
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
  corpsebloom:         { base: 1, formula: lv => 1 * lv },
};

function formatItemSpecial(item) {
  if (!item.special) return '';
  const lv = item.level || 1;
  if (lv <= 1) return item.special;
  const baseId = item.baseId || item.id;
  const scaling = ITEM_SPECIAL_SCALING[baseId];
  if (!scaling) return item.special;
  const scaled = scaling.formula(lv);
  // Replace the first occurrence of the base number with the scaled value
  return item.special.replace(new RegExp('\\b' + scaling.base + '\\b'), String(scaled));
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
