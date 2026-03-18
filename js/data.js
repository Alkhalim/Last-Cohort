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
  pair: () => ({ type: 'pair', dice: 2, label: 'Pair' }),
};

// --- Target types ---
const TARGET = {
  SINGLE_ENEMY: 'single_enemy',
  DUAL_ENEMY: 'dual_enemy',
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

    // Damage (single target or split across dual targets)
    if (effects.damage !== undefined) {
      if (effects.splitDamage && targets.length >= 2) {
        result.splitDamage = true;
        result.damage = effects.damage; // full base damage — will be split after bonuses in applySkillResult
        result.baseDamage = effects.damage;
        result.target = targets[0];
        result.secondTarget = targets[1];
      } else {
        result.damage = effects.damage;
        result.baseDamage = effects.damage;
        if (targets[0]) result.target = targets[0];
      }
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

    // Block (self — but don't override target if damage already set it to an enemy)
    if (effects.block !== undefined) {
      let block = effects.block;
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

    // Splash back row: half damage pierces to all back-row enemies
    if (effects.splashBackRow) {
      result.splashBackRow = true;
    }

    // Knockback: shove front-row enemy to back row
    if (effects.knockback) {
      result.knockback = true;
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
  if (skillData.cooldown) skill.cooldown = skillData.cooldown;
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
      equipSlots: rawClass.equipSlots || { weapon: 2, armor: 2, trinket: 3 },
    };
    if (rawClass.hidden) result[classId].hidden = true;
    if (rawClass.unlockCondition) result[classId].unlockCondition = rawClass.unlockCondition;
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
function generateEncounterByThreat(threat, difficulty) {
  const diff = difficulty || 1;
  const filterByDiff = (list) => list.filter(e => !e.minDifficulty || e.minDifficulty <= diff);
  if (threat <= 1 && diff <= 3) {
    const pool = filterByDiff(_encounterThreatData.easy);
    return pool[Math.floor(Math.random() * pool.length)];
  } else if (threat <= 1 && diff > 3) {
    // No easy encounters after difficulty 3 — promote to mid
    const pool = filterByDiff(_encounterThreatData.mid);
    return pool[Math.floor(Math.random() * pool.length)];
  } else if (threat === 2) {
    const pool = filterByDiff(_encounterThreatData.mid);
    return pool[Math.floor(Math.random() * pool.length)];
  } else {
    const pool = filterByDiff(_encounterThreatData.hard);
    return pool[Math.floor(Math.random() * pool.length)];
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
  // All units implicitly have the "roman" tag as a base
  const unitTags = CLASS_DATA[unit.classId].tags;
  return item.classTags.some(tag => tag === 'roman' || unitTags.includes(tag));
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
        return !item.minDifficulty || item.minDifficulty <= diff;
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

// Returns the primary (non-roman) tag for a class, for color coding
function getPrimaryTag(classId) {
  const tags = CLASS_DATA[classId] ? CLASS_DATA[classId].tags : [];
  return tags.find(t => t !== 'roman') || tags[0] || 'roman';
}

// Returns tag pip HTML for an item's classTags
function renderTagPips(classTags) {
  // Hide "roman" tag when there are other tags (avoid empty grey dot)
  const nonRoman = classTags.filter(t => t !== 'roman');
  const tagsToShow = nonRoman.length > 0 ? nonRoman : classTags;
  return tagsToShow.map(t => `<span class="tag-pip tag-${t}"></span>`).join('');
}

// Create a leveled copy of an item — each level adds +1 to a random stat (or -1 to negative stats)
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

  // Apply bonus levels — each level adds +1 to a random stat
  const statKeys = Object.keys(leveled.stats).filter(k => k !== 'extraDice');
  for (let i = 0; i < bonusLevels; i++) {
    if (statKeys.length === 0) break;
    const key = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (leveled.stats[key] < 0) {
      leveled.stats[key]--; // negative stats get more negative
    } else {
      leveled.stats[key]++;
    }
  }

  // Update name to show level
  leveled.name = base.name + ' +' + bonusLevels;

  // Register in ITEM_DATA so getItemData works
  ITEM_DATA[instanceId] = leveled;

  return instanceId;
}

function formatItemStats(stats) {
  const parts = [];
  if (stats.damage) parts.push(`+${stats.damage} dmg`);
  if (stats.block) parts.push(`+${stats.block} block`);
  if (stats.maxHp) parts.push(`+${stats.maxHp} HP`);
  if (stats.heal) parts.push(`+${stats.heal} heal`);
  if (stats.poison) parts.push(`+${stats.poison} poison`);
  if (stats.extraDice) parts.push(`+${stats.extraDice} die`);
  return parts.join(', ');
}
