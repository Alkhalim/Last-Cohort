// ============================================================
// Last Cohort – Game Data
// ============================================================

// --- Skill cost types ---
// threshold: die >= value
// exact: die === value
// any: any die works
// combined: sum of N dice meets condition
// sacrifice: costs HP + exact die

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

// --- Class definitions ---
const CLASS_DATA = {
  legionary: {
    name: 'Legionary',
    title: 'LEG',
    maxHp: 32,
    description: 'Heavy infantry. Reliable damage and strong defense.',
    passive: {
      name: 'Shield Discipline',
      description: 'First defensive action with a 4+ die each encounter grants +4 extra Block.',
      triggered: false,
    },
    skills: [
      {
        id: 'strike',
        name: 'Strike',
        cost: COST.any(),
        target: TARGET.SINGLE_ENEMY,
        damage: 4,
        description: 'Basic sword strike. Deals 4 damage.',
        execute(unit, targets, dice) {
          return { damage: 4, target: targets[0], text: `${unit.name} strikes for 4 damage.` };
        },
      },
      {
        id: 'shield_brace',
        name: 'Shield Brace',
        cost: COST.threshold(2),
        target: TARGET.SELF,
        description: 'Gain 5 Block. (4+ triggers Shield Discipline for +4 more, once per encounter.)',
        execute(unit, targets, dice) {
          let block = 5;
          let text = '';
          if (dice[0] >= 4 && !unit.passiveTriggered) {
            block += 4;
            unit.passiveTriggered = true;
            text = `${unit.name} braces shield for ${block} Block (Shield Discipline!).`;
          } else {
            text = `${unit.name} braces shield for ${block} Block.`;
          }
          return { block, target: unit, text };
        },
      },
      {
        id: 'gladius_thrust',
        name: 'Gladius Thrust',
        cost: COST.threshold(3),
        target: TARGET.SINGLE_ENEMY,
        damage: 7,
        description: 'Precise thrust. Deals 7 damage.',
        execute(unit, targets, dice) {
          return { damage: 7, target: targets[0], text: `${unit.name} thrusts gladius for 7 damage!` };
        },
      },
      {
        id: 'hold_fast',
        name: 'Hold Fast',
        cost: COST.exact(4),
        target: TARGET.SELF,
        description: 'Gain 8 Block and Taunt (enemies target this unit).',
        execute(unit, targets, dice) {
          return { block: 8, taunt: true, target: unit, text: `${unit.name} holds fast! 8 Block, taunting enemies.` };
        },
      },
      {
        id: 'pilum_cast',
        name: 'Pilum Cast',
        cost: COST.threshold(5),
        target: TARGET.SINGLE_ENEMY,
        damage: 10,
        ignoreRow: true,
        description: 'Throw pilum at any row. Deals 10 damage.',
        execute(unit, targets, dice) {
          return { damage: 10, target: targets[0], ignoreRow: true, text: `${unit.name} hurls pilum for 10 damage!` };
        },
      },
    ],
  },

  centurion: {
    name: 'Centurion',
    title: 'CEN',
    maxHp: 28,
    description: 'Officer. Buffs allies and controls the battlefield.',
    passive: {
      name: 'Discipline of Office',
      description: 'Once per turn, adjust one die by +1 or -1.',
      usedThisTurn: false,
    },
    skills: [
      {
        id: 'strike',
        name: 'Strike',
        cost: COST.any(),
        target: TARGET.SINGLE_ENEMY,
        damage: 3,
        description: 'Basic strike. Deals 3 damage.',
        execute(unit, targets, dice) {
          return { damage: 3, target: targets[0], text: `${unit.name} strikes for 3 damage.` };
        },
      },
      {
        id: 'commanding_shout',
        name: 'Commanding Shout',
        cost: COST.exact(3),
        target: TARGET.ALL_ALLIES,
        description: 'All allies gain +2 damage on their next action this turn.',
        execute(unit, targets, dice) {
          return { buffAllies: { bonusDamage: 2 }, target: 'all_allies', text: `${unit.name} shouts commands! Allies gain +2 damage.` };
        },
      },
      {
        id: 'reform_the_line',
        name: 'Reform the Line',
        cost: COST.threshold(4),
        target: TARGET.ALL_ALLIES,
        description: 'All allies gain 3 Block.',
        execute(unit, targets, dice) {
          return { blockAll: 3, target: 'all_allies', text: `${unit.name} reforms the line! All gain 3 Block.` };
        },
      },
      {
        id: 'measured_advance',
        name: 'Measured Advance',
        cost: COST.combined(7, 2),
        target: TARGET.SINGLE_ENEMY,
        damage: 12,
        description: 'Requires 2 dice totaling 7+. Deals 12 damage.',
        execute(unit, targets, dice) {
          return { damage: 12, target: targets[0], text: `${unit.name} leads a measured advance for 12 damage!` };
        },
      },
      {
        id: 'no_retreat',
        name: 'No Retreat',
        cost: COST.exact(6),
        target: TARGET.ALL_ALLIES,
        description: 'All allies gain 5 Block and +10 Morale.',
        execute(unit, targets, dice) {
          return { blockAll: 5, morale: 10, target: 'all_allies', text: `${unit.name}: "No retreat!" All gain 5 Block, +10 Morale.` };
        },
      },
    ],
  },

  medicus: {
    name: 'Medicus',
    title: 'MED',
    maxHp: 22,
    description: 'Field surgeon. Heals allies and manages attrition.',
    passive: {
      name: 'Field Triage',
      description: 'When an ally is downed, gain one free Bind Wounds this encounter.',
      freeHealAvailable: false,
    },
    skills: [
      {
        id: 'strike',
        name: 'Weak Strike',
        cost: COST.any(),
        target: TARGET.SINGLE_ENEMY,
        damage: 2,
        description: 'Feeble strike. Deals 2 damage.',
        execute(unit, targets, dice) {
          return { damage: 2, target: targets[0], text: `${unit.name} strikes weakly for 2 damage.` };
        },
      },
      {
        id: 'bind_wounds',
        name: 'Bind Wounds',
        cost: COST.threshold(2),
        target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 6 HP.',
        execute(unit, targets, dice) {
          return { heal: 6, target: targets[0], text: `${unit.name} binds wounds, healing ${targets[0].name} for 6 HP.` };
        },
      },
      {
        id: 'triage',
        name: 'Triage',
        cost: COST.exact(4),
        target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 10 HP and remove one negative condition.',
        execute(unit, targets, dice) {
          return { heal: 10, cleanse: true, target: targets[0], text: `${unit.name} performs triage on ${targets[0].name}, healing 10 HP!` };
        },
      },
      {
        id: 'emergency_draught',
        name: 'Emergency Draught',
        cost: COST.threshold(5),
        target: TARGET.SINGLE_ALLY,
        description: 'Heal an ally for 14 HP.',
        execute(unit, targets, dice) {
          return { heal: 14, target: targets[0], text: `${unit.name} administers emergency draught! ${targets[0].name} heals 14 HP.` };
        },
      },
      {
        id: 'sawbones_choice',
        name: "Sawbones' Choice",
        cost: COST.exact(1),
        target: TARGET.SINGLE_ALLY,
        description: 'Sacrifice 4 HP from Medicus to heal ally for 12 HP.',
        execute(unit, targets, dice) {
          return {
            heal: 12,
            selfDamage: 4,
            target: targets[0],
            text: `${unit.name} sacrifices own blood to heal ${targets[0].name} for 12 HP! (Takes 4 damage)`,
          };
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
    maxHp: 18,
    row: 'front',
    damage: [4, 7],
    speed: 1,
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
    maxHp: 12,
    row: 'back',
    damage: [3, 5],
    speed: 2,
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
    maxHp: 14,
    row: 'front',
    damage: [3, 6],
    speed: 3,
    description: 'Fast predator. Attacks twice when wounded.',
    ai: 'aggressive',
    actions: [
      { name: 'Bite', damage: 4, chance: 0.5, text: 'lunges with snapping jaws' },
      { name: 'Pounce', damage: 6, chance: 0.3, text: 'pounces' },
      { name: 'Howl', damage: 0, morale: -8, chance: 0.2, text: 'howls into the mist' },
    ],
  },
};

// --- Encounter templates ---
const ENCOUNTERS = [
  {
    name: 'Ambush on the Trail',
    enemies: ['cheruscan_raider', 'cheruscan_raider', 'sling_hunter'],
    intro: 'Shapes burst from the undergrowth — Germanic warriors block the path.',
  },
  {
    name: 'Wolves in the Mire',
    enemies: ['marsh_wolf', 'marsh_wolf'],
    intro: 'Low growls echo from the fog. Yellow eyes track your every step.',
  },
  {
    name: 'Raiding Party',
    enemies: ['cheruscan_raider', 'sling_hunter', 'sling_hunter'],
    intro: 'Stones whistle past. A raiding party has found your trail.',
  },
  {
    name: 'The Clearing',
    enemies: ['cheruscan_raider', 'cheruscan_raider', 'marsh_wolf', 'sling_hunter'],
    intro: 'You stumble into a clearing — and into an ambush. Steel and fangs surround you.',
  },
];

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
