// ============================================================
// Last Cohort – Game Data (loads from JSON files)
// ============================================================

// --- Skill cost types ---
const COST = {
  threshold: (min) => ({ type: 'threshold', min, dice: 1, label: `${min}+` }),
  range: (min, max) => ({ type: 'range', min, max, dice: 1, label: `${min}-${max}` }),
  exact: (val) => ({ type: 'exact', val, dice: 1, label: `=${val}` }),
  any: () => ({ type: 'any', dice: 1, label: 'Any' }),
  combined: (min, count = 2) => ({ type: 'combined', min, dice: count, label: `${count}d ${min}+` }),
  combinedExact: (val, count = 2) => ({ type: 'combinedExact', val, dice: count, label: `${count}d =${val}` }),
};

// --- Target types ---
const TARGET = {
  SINGLE_ENEMY: 'single_enemy',
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

    // Damage (single target)
    if (effects.damage !== undefined) {
      result.damage = effects.damage;
      result.baseDamage = effects.damage;
      if (targets[0]) result.target = targets[0];
    }

    // Heal (single target)
    if (effects.heal !== undefined) {
      result.heal = effects.heal;
      result.baseHeal = effects.heal;
      if (targets[0]) result.target = targets[0];
    }

    // Heal all allies
    if (effects.healAll !== undefined) {
      result.healAll = effects.healAll;
      result.baseHeal = effects.healAll;
    }

    // Block (self)
    if (effects.block !== undefined) {
      let block = effects.block;
      // Handle passive trigger (Shield Brace + Shield Discipline)
      if (passiveTrigger) {
        if (dice[0] && dice[0].value >= passiveTrigger.dieMin && !unit.passiveTriggered) {
          block += passiveTrigger.bonusBlock;
          unit.passiveTriggered = true;
        }
      }
      result.block = block;
      result.target = unit;
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
  };
  if (skillData.starter) skill.starter = true;
  if (skillData.ignoreRow) skill.ignoreRow = true;
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
    };
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
function generateEncounterByThreat(threat) {
  if (threat <= 1) {
    const easy = _encounterThreatData.easy;
    return easy[Math.floor(Math.random() * easy.length)];
  } else if (threat === 2) {
    const mid = _encounterThreatData.mid;
    return mid[Math.floor(Math.random() * mid.length)];
  } else {
    const hard = _encounterThreatData.hard;
    return hard[Math.floor(Math.random() * hard.length)];
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
  return item.classTags.some(tag => CLASS_DATA[unit.classId].tags.includes(tag));
}

// --- Drop / loot helpers ---
function rollDrop(enemyId, party) {
  const table = DROP_TABLES[enemyId];
  if (!table) return null;
  const roll = Math.random();
  let cumulative = table.nothingChance;
  if (roll < cumulative) return null;
  for (const tier of table.tiers) {
    cumulative += tier.chance;
    if (roll < cumulative) {
      let candidates = tier.items;
      // Smart drop filtering: reduce chance if slot is full on all eligible characters
      if (party && party.length > 0) {
        candidates = candidates.filter(itemId => {
          const item = ITEM_DATA[itemId];
          if (!item) return true;
          const eligible = party.filter(u => canEquipItem(u, item));
          if (eligible.length === 0) return false;
          const allFull = eligible.every(u => {
            const slots = u.equipment[item.slot];
            return slots.every(s => s !== null);
          });
          if (allFull) {
            // 60% chance to skip this item
            return Math.random() > 0.6;
          }
          return true;
        });
        if (candidates.length === 0) candidates = tier.items;
      }
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return null;
}

function getItemData(itemId) {
  return ITEM_DATA[itemId] || null;
}

// Returns the primary (non-roman) tag for a class, for color coding
function getPrimaryTag(classId) {
  const tags = CLASS_DATA[classId] ? CLASS_DATA[classId].tags : [];
  return tags.find(t => t !== 'roman') || tags[0] || 'roman';
}

// Returns tag pip HTML for an item's classTags
function renderTagPips(classTags) {
  return classTags.map(t => `<span class="tag-pip tag-${t}"></span>`).join('');
}

function formatItemStats(stats) {
  const parts = [];
  if (stats.damage) parts.push(`+${stats.damage} dmg`);
  if (stats.block) parts.push(`+${stats.block} block`);
  if (stats.maxHp) parts.push(`+${stats.maxHp} HP`);
  if (stats.heal) parts.push(`+${stats.heal} heal`);
  if (stats.extraDice) parts.push(`+${stats.extraDice} die`);
  return parts.join(', ');
}
