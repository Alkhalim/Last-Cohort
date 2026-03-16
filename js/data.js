// ============================================================
// Last Cohort – Game Data
// ============================================================

// --- Skill cost types ---
const COST = {
  threshold: (min) => ({ type: 'threshold', min, dice: 1, label: `${min}+` }),
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

// --- XP thresholds per level ---
const XP_PER_LEVEL = [0, 10, 25, 50, 80, 120];
// Level 1: 0 XP (start), Level 2: 10 XP, etc.

function getLevelForXp(xp) {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) return i + 1;
  }
  return 1;
}

function getXpToNextLevel(xp) {
  const lvl = getLevelForXp(xp);
  if (lvl >= XP_PER_LEVEL.length) return null; // max level
  return XP_PER_LEVEL[lvl] - xp;
}

// --- Class definitions ---
// Skills have `unlockLevel` — available from that level onward.
// Skills return base values; the combat engine adds equipment/buff bonuses and builds the log text.
const CLASS_DATA = {
  legionary: {
    name: 'Legionary',
    title: 'LEG',
    maxHp: 32,
    tags: ['heavy', 'roman'],
    description: 'Heavy infantry. Reliable damage and strong defense.',
    passive: {
      name: 'Shield Discipline',
      description: 'First defensive action with a 4+ die each encounter grants +4 extra Block.',
      triggered: false,
    },
    skills: [
      // --- Starting skills (level 1) ---
      {
        id: 'strike', name: 'Strike', unlockLevel: 1,
        cost: COST.any(), target: TARGET.SINGLE_ENEMY,
        description: 'Basic sword strike. Deals 4 damage.',
        execute(unit, targets, dice) {
          return { damage: 4, baseDamage: 4, target: targets[0] };
        },
      },
      {
        id: 'shield_brace', name: 'Shield Brace', unlockLevel: 1,
        cost: COST.threshold(2), target: TARGET.SELF,
        description: 'Gain 5 Block. (4+ triggers Shield Discipline for +4.)',
        execute(unit, targets, dice) {
          let block = 5;
          if (dice[0] && dice[0].value >= 4 && !unit.passiveTriggered) {
            block += 4;
            unit.passiveTriggered = true;
          }
          return { block, target: unit };
        },
      },
      {
        id: 'gladius_thrust', name: 'Gladius Thrust', unlockLevel: 1,
        cost: COST.threshold(3), target: TARGET.SINGLE_ENEMY,
        description: 'Precise thrust. Deals 7 damage.',
        execute(unit, targets, dice) {
          return { damage: 7, baseDamage: 7, target: targets[0] };
        },
      },
      // --- Unlockable skills ---
      {
        id: 'hold_fast', name: 'Hold Fast', unlockLevel: 2,
        cost: COST.exact(4), target: TARGET.SELF,
        description: 'Gain 8 Block and Taunt (enemies target this unit).',
        execute(unit, targets, dice) {
          return { block: 8, taunt: true, target: unit };
        },
      },
      {
        id: 'pilum_cast', name: 'Pilum Cast', unlockLevel: 3,
        cost: COST.threshold(5), target: TARGET.SINGLE_ENEMY,
        ignoreRow: true,
        description: 'Throw pilum at any row. Deals 10 damage.',
        execute(unit, targets, dice) {
          return { damage: 10, baseDamage: 10, target: targets[0], ignoreRow: true };
        },
      },
      {
        id: 'twin_slash', name: 'Twin Slash', unlockLevel: 2,
        cost: COST.combined(5, 2), target: TARGET.SINGLE_ENEMY,
        description: '2 dice totaling 5+. Deals 11 damage.',
        execute(unit, targets, dice) {
          return { damage: 11, baseDamage: 11, target: targets[0] };
        },
      },
      {
        id: 'shield_wall', name: 'Shield Wall', unlockLevel: 4,
        cost: COST.combined(8, 2), target: TARGET.ALL_ALLIES,
        description: '2 dice totaling 8+. All allies gain 6 Block.',
        execute(unit, targets, dice) {
          return { blockAll: 6 };
        },
      },
    ],
  },

  centurion: {
    name: 'Centurion',
    title: 'CEN',
    maxHp: 28,
    tags: ['command', 'roman'],
    description: 'Officer. Buffs allies and controls the battlefield.',
    passive: {
      name: 'Discipline of Office',
      description: 'Once per turn, adjust one die by +1 or -1.',
      usedThisTurn: false,
    },
    skills: [
      {
        id: 'strike', name: 'Strike', unlockLevel: 1,
        cost: COST.any(), target: TARGET.SINGLE_ENEMY,
        description: 'Basic strike. Deals 3 damage.',
        execute(unit, targets, dice) {
          return { damage: 3, baseDamage: 3, target: targets[0] };
        },
      },
      {
        id: 'commanding_shout', name: 'Commanding Shout', unlockLevel: 1,
        cost: COST.exact(3), target: TARGET.ALL_ALLIES,
        description: 'All allies gain +2 damage on their next attack.',
        execute(unit, targets, dice) {
          return { buffAllies: { bonusDamage: 2, attacks: 1 } };
        },
      },
      {
        id: 'reform_the_line', name: 'Reform the Line', unlockLevel: 1,
        cost: COST.threshold(4), target: TARGET.ALL_ALLIES,
        description: 'All allies gain 3 Block.',
        execute(unit, targets, dice) {
          return { blockAll: 3 };
        },
      },
      {
        id: 'measured_advance', name: 'Measured Advance', unlockLevel: 2,
        cost: COST.combined(7, 2), target: TARGET.SINGLE_ENEMY,
        description: '2 dice totaling 7+. Deals 12 damage.',
        execute(unit, targets, dice) {
          return { damage: 12, baseDamage: 12, target: targets[0] };
        },
      },
      {
        id: 'no_retreat', name: 'No Retreat', unlockLevel: 3,
        cost: COST.exact(6), target: TARGET.ALL_ALLIES,
        description: 'All allies gain 5 Block and +10 Morale.',
        execute(unit, targets, dice) {
          return { blockAll: 5, morale: 10 };
        },
      },
      {
        id: 'rally_cry', name: 'Rally Cry', unlockLevel: 2,
        cost: COST.combined(6, 2), target: TARGET.ALL_ALLIES,
        description: '2 dice totaling 6+. +15 Morale and all allies gain +1 damage for next 2 attacks.',
        execute(unit, targets, dice) {
          return { morale: 15, buffAllies: { bonusDamage: 1, attacks: 2 } };
        },
      },
      {
        id: 'decimation_strike', name: 'Decimation Strike', unlockLevel: 4,
        cost: COST.combinedExact(7, 2), target: TARGET.SINGLE_ENEMY,
        description: '2 dice totaling exactly 7. Deals 16 damage.',
        execute(unit, targets, dice) {
          return { damage: 16, baseDamage: 16, target: targets[0] };
        },
      },
    ],
  },

  medicus: {
    name: 'Medicus',
    title: 'MED',
    maxHp: 22,
    tags: ['support', 'roman'],
    description: 'Field surgeon. Heals allies and manages attrition.',
    passive: {
      name: 'Field Triage',
      description: 'When an ally is downed, gain one free Bind Wounds this encounter.',
      freeHealAvailable: false,
    },
    skills: [
      {
        id: 'strike', name: 'Weak Strike', unlockLevel: 1,
        cost: COST.any(), target: TARGET.SINGLE_ENEMY,
        description: 'Feeble strike. Deals 2 damage.',
        execute(unit, targets, dice) {
          return { damage: 2, baseDamage: 2, target: targets[0] };
        },
      },
      {
        id: 'bind_wounds', name: 'Bind Wounds', unlockLevel: 1,
        cost: COST.threshold(2), target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 6 HP.',
        execute(unit, targets, dice) {
          return { heal: 6, baseHeal: 6, target: targets[0] };
        },
      },
      {
        id: 'triage', name: 'Triage', unlockLevel: 1,
        cost: COST.exact(4), target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 10 HP.',
        execute(unit, targets, dice) {
          return { heal: 10, baseHeal: 10, cleanse: true, target: targets[0] };
        },
      },
      {
        id: 'emergency_draught', name: 'Emergency Draught', unlockLevel: 2,
        cost: COST.threshold(5), target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 14 HP.',
        execute(unit, targets, dice) {
          return { heal: 14, baseHeal: 14, target: targets[0] };
        },
      },
      {
        id: 'sawbones_choice', name: "Sawbones' Choice", unlockLevel: 3,
        cost: COST.exact(1), target: TARGET.SINGLE_ALLY,
        description: 'Sacrifice 4 HP to heal ally for 12 HP.',
        execute(unit, targets, dice) {
          return { heal: 12, baseHeal: 12, selfDamage: 4, target: targets[0] };
        },
      },
      {
        id: 'field_surgery', name: 'Field Surgery', unlockLevel: 2,
        cost: COST.combined(6, 2), target: TARGET.SINGLE_ALLY,
        description: '2 dice totaling 6+. Heal ally for 18 HP.',
        execute(unit, targets, dice) {
          return { heal: 18, baseHeal: 18, target: targets[0] };
        },
      },
      {
        id: 'poison_blade', name: 'Poison Blade', unlockLevel: 4,
        cost: COST.combined(4, 2), target: TARGET.SINGLE_ENEMY,
        description: '2 dice totaling 4+. Deals 8 damage.',
        execute(unit, targets, dice) {
          return { damage: 8, baseDamage: 8, target: targets[0] };
        },
      },
    ],
  },
};

// --- Enemy definitions ---
const ENEMY_DATA = {
  cheruscan_raider: {
    id: 'cheruscan_raider',
    name: 'Cheruscan Raider',
    maxHp: 18, row: 'front',
    damage: [4, 7], speed: 1, xpValue: 5,
    description: 'Germanic warrior. Aggressive melee fighter.',
    ai: 'aggressive',
    actions: [
      { name: 'Spear Thrust', damage: 5, chance: 0.6, text: 'thrusts spear' },
      { name: 'Wild Slash', damage: 7, chance: 0.3, text: 'slashes wildly' },
      { name: 'War Cry', damage: 0, morale: -5, chance: 0.1, text: 'lets out a war cry' },
    ],
  },
  sling_hunter: {
    id: 'sling_hunter',
    name: 'Sling Hunter',
    maxHp: 12, row: 'back',
    damage: [3, 5], speed: 2, xpValue: 4,
    description: 'Ranged skirmisher. Targets weakest unit.',
    ai: 'sniper',
    actions: [
      { name: 'Sling Stone', damage: 4, chance: 0.7, text: 'hurls a sling stone', ignoreRow: true },
      { name: 'Aimed Shot', damage: 6, chance: 0.2, text: 'takes careful aim', ignoreRow: true },
      { name: 'Scatter Shot', damage: 3, chance: 0.1, text: 'fires scatter shot at the line', aoe: true },
    ],
  },
  marsh_wolf: {
    id: 'marsh_wolf',
    name: 'Marsh Wolf',
    maxHp: 14, row: 'front',
    damage: [3, 6], speed: 3, xpValue: 4,
    description: 'Fast predator. Attacks twice when wounded.',
    ai: 'aggressive',
    actions: [
      { name: 'Bite', damage: 4, chance: 0.5, text: 'lunges with snapping jaws' },
      { name: 'Pounce', damage: 6, chance: 0.3, text: 'pounces' },
      { name: 'Howl', damage: 0, morale: -8, chance: 0.2, text: 'howls into the mist' },
    ],
  },
  arminius_champion: {
    id: 'arminius_champion',
    name: "Arminius's Champion",
    maxHp: 55, row: 'front',
    damage: [8, 14], speed: 2, xpValue: 20,
    isBoss: true,
    ai: 'boss',
    actions: [
      { name: 'Crushing Blow', damage: 10, chance: 0.4, text: 'brings down a crushing blow' },
      { name: 'Shield Bash', damage: 6, chance: 0.25, text: 'bashes with iron shield' },
      { name: 'War Cry', damage: 0, morale: -12, chance: 0.15, text: 'roars a war cry' },
      { name: 'Frenzy', damage: 8, chance: 0.2, text: 'attacks in a frenzy', aoe: true },
    ],
  },
};

// --- Encounter templates ---
const ENCOUNTERS = [
  { name: 'Ambush on the Trail', enemies: ['cheruscan_raider', 'cheruscan_raider', 'sling_hunter'],
    intro: 'Shapes burst from the undergrowth \u2014 Germanic warriors block the path.' },
  { name: 'Wolves in the Mire', enemies: ['marsh_wolf', 'marsh_wolf'],
    intro: 'Low growls echo from the fog. Yellow eyes track your every step.' },
  { name: 'Raiding Party', enemies: ['cheruscan_raider', 'sling_hunter', 'sling_hunter'],
    intro: 'Stones whistle past. A raiding party has found your trail.' },
  { name: 'The Clearing', enemies: ['cheruscan_raider', 'cheruscan_raider', 'marsh_wolf', 'sling_hunter'],
    intro: 'You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you.' },
];

// --- Boss encounters ---
const BOSS_ENCOUNTERS = [
  {
    name: "Arminius's Champion",
    enemies: ['arminius_champion', 'cheruscan_raider'],
    intro: "A towering Germanic champion steps from the treeline, flanked by his guard. The final test.",
  },
];

// --- Encounter generation by threat level ---
function generateEncounterByThreat(threat) {
  if (threat <= 1) {
    const easy = [
      { name: 'Forest Scouts', enemies: ['cheruscan_raider', 'sling_hunter'], intro: 'A pair of scouts spot your column and attack.' },
      { name: 'Lone Wolves', enemies: ['marsh_wolf', 'marsh_wolf'], intro: 'Wolves slink from the undergrowth, hungry and desperate.' },
    ];
    return easy[Math.floor(Math.random() * easy.length)];
  } else if (threat === 2) {
    const mid = [
      { name: 'Ambush on the Trail', enemies: ['cheruscan_raider', 'cheruscan_raider', 'sling_hunter'], intro: 'Shapes burst from the undergrowth \u2014 Germanic warriors block the path.' },
      { name: 'Raiding Party', enemies: ['cheruscan_raider', 'sling_hunter', 'sling_hunter'], intro: 'Stones whistle past. A raiding party has found your trail.' },
      { name: 'Wolf Pack', enemies: ['marsh_wolf', 'marsh_wolf', 'marsh_wolf'], intro: 'A whole wolf pack emerges from the fog. There is no retreat.' },
    ];
    return mid[Math.floor(Math.random() * mid.length)];
  } else {
    const hard = [
      { name: 'The Clearing', enemies: ['cheruscan_raider', 'cheruscan_raider', 'marsh_wolf', 'sling_hunter'], intro: 'You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you.' },
      { name: 'War Band', enemies: ['cheruscan_raider', 'cheruscan_raider', 'cheruscan_raider', 'sling_hunter'], intro: 'A full war band charges from the trees. Prepare for a desperate fight.' },
    ];
    return hard[Math.floor(Math.random() * hard.length)];
  }
}

// --- Morale thresholds ---
const MORALE_BANDS = [
  { min: 75, label: 'INSPIRED', color: '#c9a227' },
  { min: 25, label: 'STEADY', color: '#6b8f4a' },
  { min: -24, label: 'SHAKEN', color: '#8a8a7a' },
  { min: -74, label: 'DISTRESSED', color: '#a0522d' },
  { min: -100, label: 'BROKEN', color: '#6b1a1a' },
];

function getMoraleBand(morale) {
  for (const band of MORALE_BANDS) {
    if (morale >= band.min) return band;
  }
  return MORALE_BANDS[MORALE_BANDS.length - 1];
}

// --- Equipment slot counts ---
const EQUIP_SLOTS = {
  weapon: 2,
  armor: 2,
  trinket: 3,
};

// --- Item definitions ---
const ITEM_DATA = {
  iron_gladius: {
    id: 'iron_gladius', name: 'Iron Gladius', slot: 'weapon', rarity: 'common',
    classTags: ['heavy', 'command'],
    stats: { damage: 2 },
    description: 'A sturdy blade taken from a fallen raider.',
  },
  raider_shield: {
    id: 'raider_shield', name: "Raider's Shield", slot: 'armor', rarity: 'common',
    classTags: ['roman'],
    stats: { block: 2 },
    description: 'Rough wood and hide, but it turns a blade.',
  },
  wolf_pelt: {
    id: 'wolf_pelt', name: 'Wolf Pelt', slot: 'armor', rarity: 'common',
    classTags: ['roman'],
    stats: { maxHp: 4 },
    description: 'Thick fur that wards off the cold and softens blows.',
  },
  sling_stones: {
    id: 'sling_stones', name: 'Sling Stones', slot: 'weapon', rarity: 'common',
    classTags: ['command', 'support'],
    stats: { damage: 1 },
    description: 'Smooth river stones, still in their pouch.',
  },
  bone_needle_kit: {
    id: 'bone_needle_kit', name: 'Bone Needle Kit', slot: 'trinket', rarity: 'common',
    classTags: ['support'],
    stats: { heal: 3 },
    description: 'Germanic surgical tools. Crude but effective.',
  },
  herb_pouch: {
    id: 'herb_pouch', name: 'Herb Pouch', slot: 'trinket', rarity: 'common',
    classTags: ['command', 'support'],
    stats: { heal: 2 },
    description: 'Dried marsh herbs with surprising potency.',
  },
  woad_charm: {
    id: 'woad_charm', name: 'Woad Charm', slot: 'trinket', rarity: 'uncommon',
    classTags: ['roman'],
    stats: { maxHp: 3, block: 1 },
    description: 'A blue-stained bone token. It feels warm to the touch.',
  },
  hunters_cloak: {
    id: 'hunters_cloak', name: "Hunter's Cloak", slot: 'armor', rarity: 'uncommon',
    classTags: ['command', 'support'],
    stats: { maxHp: 5 },
    description: 'Woven from marsh reeds and wolf hair. Surprisingly tough.',
  },
  fang_necklace: {
    id: 'fang_necklace', name: 'Fang Necklace', slot: 'trinket', rarity: 'uncommon',
    classTags: ['roman'],
    stats: { damage: 1, maxHp: 2 },
    description: 'A string of wolf fangs. The men eye it uneasily.',
  },
  chiefs_spear: {
    id: 'chiefs_spear', name: "Chieftain's Spear", slot: 'weapon', rarity: 'rare',
    classTags: ['heavy'],
    stats: { damage: 4 },
    description: 'Ash-hafted and iron-tipped. Taken from a war chief.',
  },
  marsh_fang: {
    id: 'marsh_fang', name: 'Marsh Fang', slot: 'trinket', rarity: 'rare',
    classTags: ['support'],
    stats: { heal: 5, maxHp: 3 },
    description: 'A hollowed fang filled with dark salve. Potent medicine.',
  },
  runic_stone: {
    id: 'runic_stone', name: 'Runic Stone', slot: 'trinket', rarity: 'rare',
    classTags: ['roman'],
    stats: { extraDice: 1 },
    description: 'A stone carved with strange runes. It hums faintly. (+1 die per turn)',
  },
  scouts_sling: {
    id: 'scouts_sling', name: "Scout's Sling", slot: 'weapon', rarity: 'uncommon',
    classTags: ['support'],
    stats: { damage: 2 },
    description: 'A well-worn sling. Even the surgeon can fight.',
  },
  // Boss-exclusive items
  champions_helm: {
    id: 'champions_helm', name: "Champion's Helm", slot: 'armor', rarity: 'rare',
    classTags: ['heavy', 'command'],
    stats: { maxHp: 6, block: 2 },
    description: 'A heavy iron helm ripped from the champion. It reeks of blood.',
  },
  arm_ring_of_arminius: {
    id: 'arm_ring_of_arminius', name: 'Arm Ring of Arminius', slot: 'trinket', rarity: 'rare',
    classTags: ['roman'],
    stats: { damage: 2, maxHp: 3 },
    description: 'A gold arm ring inscribed with Germanic runes. Power radiates from it.',
  },
  warlords_blade: {
    id: 'warlords_blade', name: "Warlord's Blade", slot: 'weapon', rarity: 'rare',
    classTags: ['heavy'],
    stats: { damage: 5 },
    description: 'A massive iron sword. Only the strongest can wield it.',
  },
};

// Boss-exclusive drop pool
const BOSS_DROP_POOL = ['champions_helm', 'arm_ring_of_arminius', 'warlords_blade'];

// --- canEquipItem helper ---
function canEquipItem(unit, item) {
  return item.classTags.some(tag => CLASS_DATA[unit.classId].tags.includes(tag));
}

// --- Drop tables per enemy ---
const DROP_TABLES = {
  cheruscan_raider: {
    nothingChance: 0.25,
    tiers: [
      { chance: 0.45, items: ['iron_gladius', 'raider_shield', 'herb_pouch'] },
      { chance: 0.20, items: ['woad_charm', 'fang_necklace'] },
      { chance: 0.05, items: ['chiefs_spear', 'runic_stone'] },
    ],
  },
  sling_hunter: {
    nothingChance: 0.30,
    tiers: [
      { chance: 0.40, items: ['sling_stones', 'bone_needle_kit', 'raider_shield'] },
      { chance: 0.20, items: ['hunters_cloak', 'scouts_sling'] },
      { chance: 0.05, items: ['woad_charm', 'runic_stone'] },
    ],
  },
  marsh_wolf: {
    nothingChance: 0.25,
    tiers: [
      { chance: 0.40, items: ['wolf_pelt', 'herb_pouch'] },
      { chance: 0.25, items: ['fang_necklace'] },
      { chance: 0.10, items: ['marsh_fang', 'runic_stone'] },
    ],
  },
  arminius_champion: {
    nothingChance: 0.0,
    tiers: [
      { chance: 1.0, items: BOSS_DROP_POOL },
    ],
  },
};

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

function formatItemStats(stats) {
  const parts = [];
  if (stats.damage) parts.push(`+${stats.damage} dmg`);
  if (stats.block) parts.push(`+${stats.block} block`);
  if (stats.maxHp) parts.push(`+${stats.maxHp} HP`);
  if (stats.heal) parts.push(`+${stats.heal} heal`);
  if (stats.extraDice) parts.push(`+${stats.extraDice} die`);
  return parts.join(', ');
}

// --- Event Data ---
const EVENT_DATA = [
  {
    id: 'roadside_shrine',
    name: 'Roadside Shrine',
    intro: 'You come upon a weathered shrine to some forgotten god. Offerings of fruit and bone litter the base. The men look to you for guidance.',
    choices: [
      {
        text: 'Leave an offering and pray.',
        outcomes: [
          { weight: 0.5, text: 'A warm light fills the glade. The men feel renewed.', effects: { healAll: 8, morale: 10 } },
          { weight: 0.3, text: 'Nothing happens. The gods are silent.', effects: {} },
          { weight: 0.2, text: 'A cold wind sweeps through. The shrine crumbles. An ill omen.', effects: { morale: -10 } },
        ],
      },
      {
        text: 'Smash the shrine and take the offerings.',
        outcomes: [
          { weight: 0.4, text: 'You find a charm hidden among the bones.', effects: { grantItem: 'woad_charm' } },
          { weight: 0.3, text: 'The men cheer at the defiance, but the forest seems to darken.', effects: { morale: 5 } },
          { weight: 0.3, text: 'A trap! Poisoned thorns cut your hands.', effects: { damageAll: 5, morale: -5 } },
        ],
      },
      {
        text: 'Pass by without stopping.',
        outcomes: [
          { weight: 1.0, text: 'You march on. The shrine watches in silence.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 'fallen_legionary',
    name: 'Fallen Legionary',
    intro: 'A Roman soldier lies against a tree, barely alive. His armor is shattered and his eyes are dim. He clutches a leather satchel.',
    choices: [
      {
        text: 'Tend to his wounds and take the satchel.',
        outcomes: [
          { weight: 0.6, text: 'He dies in your arms, but the satchel holds useful supplies.', effects: { grantItem: 'herb_pouch', morale: -5 } },
          { weight: 0.4, text: 'He revives briefly and whispers a warning about the path ahead. The satchel holds medicine.', effects: { healAll: 6, morale: 5 } },
        ],
      },
      {
        text: 'Take his equipment and move on.',
        outcomes: [
          { weight: 0.5, text: 'His gladius is still sharp.', effects: { grantItem: 'iron_gladius' } },
          { weight: 0.5, text: 'Nothing of value remains. The men grow quiet.', effects: { morale: -8 } },
        ],
      },
    ],
  },
  {
    id: 'river_crossing',
    name: 'River Crossing',
    intro: 'A swollen river blocks your path. The current is fast and the water dark. Upstream, a narrow fallen log offers a precarious bridge.',
    choices: [
      {
        text: 'Ford the river directly.',
        outcomes: [
          { weight: 0.4, text: 'You push through the freezing water. Everyone makes it, barely.', effects: { damageAll: 4, morale: -5 } },
          { weight: 0.3, text: 'The crossing goes smoothly. The cold water numbs old wounds.', effects: { healAll: 3 } },
          { weight: 0.3, text: 'The current is stronger than expected. Equipment is lost.', effects: { damageAll: 6, morale: -10 } },
        ],
      },
      {
        text: 'Cross on the fallen log.',
        outcomes: [
          { weight: 0.5, text: 'Careful footing gets everyone across safely.', effects: { morale: 5 } },
          { weight: 0.3, text: 'The log holds. You find a cache on the far bank.', effects: { grantItem: 'fang_necklace' } },
          { weight: 0.2, text: 'The log snaps! Several soldiers tumble into the rapids.', effects: { damageAll: 8, morale: -8 } },
        ],
      },
    ],
  },
  {
    id: 'captured_scout',
    name: 'Captured Scout',
    intro: 'Your men drag a struggling Germanic scout from the bushes. He spits and snarls but is clearly terrified.',
    choices: [
      {
        text: 'Interrogate him for information.',
        outcomes: [
          { weight: 0.5, text: 'He reveals a hidden supply cache before escaping.', effects: { grantItem: 'herb_pouch', morale: 5 } },
          { weight: 0.3, text: 'He tells you nothing useful and manages to bite a soldier.', effects: { damageAll: 2 } },
          { weight: 0.2, text: 'He breaks free and screams an alarm. You must move quickly.', effects: { morale: -12 } },
        ],
      },
      {
        text: 'Release him as a show of mercy.',
        outcomes: [
          { weight: 0.6, text: 'The men question your judgment, but the gesture feels right.', effects: { morale: 8 } },
          { weight: 0.4, text: 'He returns later with friends. You were foolish.', effects: { morale: -15 } },
        ],
      },
    ],
  },
  {
    id: 'foragers_cache',
    name: "Forager's Cache",
    intro: 'Behind a fallen oak, you discover a hidden cache of supplies \u2014 likely left by a Germanic foraging party. Dried meat, herbs, and a few weapons.',
    choices: [
      {
        text: 'Take everything.',
        outcomes: [
          { weight: 0.6, text: 'A good haul. The men eat well tonight.', effects: { healAll: 10, morale: 8 } },
          { weight: 0.4, text: 'You find excellent supplies and a fine weapon among the cache.', effects: { healAll: 6, grantItem: 'iron_gladius' } },
        ],
      },
      {
        text: 'Take only the medicine and leave the rest.',
        outcomes: [
          { weight: 0.7, text: 'The herbs are potent. Your wounded recover.', effects: { healAll: 12 } },
          { weight: 0.3, text: 'Among the herbs you find something special.', effects: { healAll: 8, grantItem: 'bone_needle_kit' } },
        ],
      },
      {
        text: 'Leave it \u2014 it could be a trap.',
        outcomes: [
          { weight: 0.5, text: 'Prudent. The men grumble but respect your caution.', effects: { morale: -3 } },
          { weight: 0.5, text: 'As you leave, you hear a tripwire snap behind you. Good instincts.', effects: { morale: 10 } },
        ],
      },
    ],
  },
];
