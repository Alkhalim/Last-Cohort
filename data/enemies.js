// ============================================================
// Last Cohort – Enemy Data
// Edit this file to add/modify enemies.
// ============================================================

const RAW_ENEMIES = {
  "cheruscan_raider": {
    "id": "cheruscan_raider", "name": "Cheruscan Raider",
    "maxHp": 18, "row": "front", "damage": [4, 7], "speed": 1, "xpValue": 5,
    "description": "Germanic warrior. Aggressive melee fighter.", "ai": "aggressive",
    "actions": [
      { "name": "Spear Thrust", "damage": 5, "chance": 0.6, "text": "thrusts spear" },
      { "name": "Wild Slash", "damage": 7, "chance": 0.3, "text": "slashes wildly" },
      { "name": "War Cry", "damage": 0, "morale": -10, "chance": 0.1, "text": "lets out a war cry" }
    ]
  },
  "sling_hunter": {
    "id": "sling_hunter", "name": "Sling Hunter",
    "maxHp": 12, "row": "back", "damage": [3, 5], "speed": 2, "xpValue": 4,
    "description": "Ranged skirmisher. Targets weakest unit.", "ai": "sniper",
    "actions": [
      { "name": "Sling Stone", "damage": 4, "chance": 0.7, "text": "hurls a sling stone", "ignoreRow": true },
      { "name": "Aimed Shot", "damage": 6, "chance": 0.2, "text": "takes careful aim", "ignoreRow": true },
      { "name": "Scatter Shot", "damage": 3, "chance": 0.1, "text": "fires scatter shot at the line", "aoe": true }
    ]
  },
  "marsh_wolf": {
    "id": "marsh_wolf", "name": "Marsh Wolf",
    "maxHp": 14, "row": "front", "damage": [3, 6], "speed": 3, "xpValue": 4,
    "description": "Fast predator. Attacks twice when wounded.", "ai": "aggressive",
    "actions": [
      { "name": "Bite", "damage": 4, "chance": 0.5, "text": "lunges with snapping jaws" },
      { "name": "Pounce", "damage": 6, "chance": 0.3, "text": "pounces" },
      { "name": "Howl", "damage": 0, "morale": -15, "chance": 0.2, "text": "howls into the mist" }
    ]
  },
  "fen_viper": {
    "id": "fen_viper", "name": "Fen Viper",
    "maxHp": 11, "row": "front", "damage": [2, 4], "speed": 4, "xpValue": 4,
    "description": "A venomous marsh snake. Its bite festers.", "ai": "aggressive",
    "actions": [
      { "name": "Venomous Bite", "damage": 2, "poisonTarget": 3, "chance": 0.5, "text": "sinks venomous fangs" },
      { "name": "Spit Venom", "damage": 1, "poisonTarget": 2, "chance": 0.3, "text": "spits venom", "ignoreRow": true },
      { "name": "Coil Strike", "damage": 5, "chance": 0.2, "text": "lashes out with a coiled strike" }
    ]
  },
  "bog_seer": {
    "id": "bog_seer", "name": "Bog Seer",
    "maxHp": 10, "row": "back", "damage": [2, 3], "speed": 1, "xpValue": 5,
    "description": "A hunched figure draped in moss, chanting from the treeline. Attacks the mind. Killing one lifts a great weight.", "ai": "sniper",
    "deathMoraleMultiplier": 2,
    "actions": [
      { "name": "Curse of Dread", "damage": 0, "morale": -18, "chance": 0.4, "text": "chants a dreadful curse" },
      { "name": "Marsh Hex", "damage": 3, "morale": -10, "chance": 0.3, "text": "hurls a hex of swamp fire", "ignoreRow": true },
      { "name": "Wail of the Dead", "damage": 0, "morale": -25, "chance": 0.2, "text": "screams with the voices of the dead" },
      { "name": "Bone Shard", "damage": 5, "chance": 0.1, "text": "flings a shard of bone", "ignoreRow": true }
    ]
  },
  "oak_shield": {
    "id": "oak_shield", "name": "Oak Shield",
    "maxHp": 35, "row": "front", "damage": [6, 10], "speed": 1, "xpValue": 10,
    "isElite": true,
    "description": "A massive warrior carrying a shield hewn from a single oak. Commands respect and fear.", "ai": "aggressive",
    "actions": [
      { "name": "Oak Smash", "damage": 8, "chance": 0.4, "text": "smashes with the great oak shield" },
      { "name": "Shieldwall Charge", "damage": 6, "chance": 0.25, "text": "charges behind the oak shield", "aoe": true },
      { "name": "Rallying Roar", "damage": 0, "morale": -15, "chance": 0.15, "text": "roars, rallying nearby warriors" },
      { "name": "Crushing Overhead", "damage": 12, "chance": 0.2, "text": "brings a devastating overhead blow" }
    ]
  },
  "cheruscan_shieldbearer": {
    "id": "cheruscan_shieldbearer", "name": "Cheruscan Shieldbearer",
    "maxHp": 20, "row": "front", "damage": [3, 5], "speed": 1, "xpValue": 6,
    "description": "A broad-shouldered warrior crouching behind an oversized wicker-and-hide shield, covering those behind him.", "ai": "aggressive",
    "actions": [
      { "name": "Wall of Shields", "damage": 0, "chance": 0.4, "text": "raises the great shield, protecting nearby warriors", "blockAllEnemies": 3 },
      { "name": "Shield Slam", "damage": 5, "chance": 0.35, "text": "slams forward with the heavy shield" },
      { "name": "Taunt of Thusnelda", "damage": 0, "morale": -15, "chance": 0.25, "text": "screams the name of Arminius\u2019s wife \u2014 your men flinch" }
    ]
  },
  "mire_leech": {
    "id": "mire_leech", "name": "Mire Leech",
    "maxHp": 8, "row": "front", "damage": [2, 4], "speed": 2, "xpValue": 3,
    "description": "A bloated, arm-length parasite from the black swamp water. The men have heard stories about these crawling into the wounded.", "ai": "aggressive",
    "canSpawn": true, "deathPoison": 2,
    "actions": [
      { "name": "Latch On", "damage": 2, "poisonTarget": 4, "chance": 0.5, "text": "latches on with burrowing mouthparts" },
      { "name": "Multiply", "damage": 0, "chance": 0.3, "text": "splits and spawns another leech", "spawn": "mire_leech" },
      { "name": "Blood Drain", "damage": 4, "poisonTarget": 2, "chance": 0.2, "text": "drains blood with a sickening pull" }
    ]
  },
  "wicker_man": {
    "id": "wicker_man", "name": "Wicker Man",
    "maxHp": 25, "row": "back", "damage": [2, 2], "speed": 0, "xpValue": 8,
    "description": "A towering effigy of woven branches, set ablaze by Germanic priests. The smoke chokes the air and shields nearby warriors.", "ai": "passive",
    "isStructure": true, "aura": { "damageReduction": 2 }, "turnDamageAll": 2, "deathDamageEnemy": 6,
    "actions": [
      { "name": "Burning Effigy", "damage": 0, "chance": 1.0, "text": "burns, choking the air with smoke" }
    ]
  },
  "arminius_champion": {
    "id": "arminius_champion", "name": "Arminius's Champion",
    "maxHp": 55, "row": "front", "damage": [8, 14], "speed": 2, "xpValue": 20,
    "isBoss": true, "ai": "boss",
    "actions": [
      { "name": "Crushing Blow", "damage": 10, "chance": 0.4, "text": "brings down a crushing blow" },
      { "name": "Shield Bash", "damage": 6, "chance": 0.25, "text": "bashes with iron shield" },
      { "name": "War Cry", "damage": 0, "morale": -20, "chance": 0.15, "text": "roars a war cry" },
      { "name": "Frenzy", "damage": 8, "chance": 0.2, "text": "attacks in a frenzy", "aoe": true }
    ]
  },
  "grove_witch": {
    "id": "grove_witch", "name": "Grove Witch",
    "maxHp": 45, "row": "back", "damage": [5, 10], "speed": 1, "xpValue": 22,
    "isBoss": true, "ai": "boss",
    "actions": [
      { "name": "Thorn Volley", "damage": 5, "chance": 0.3, "text": "sends a volley of blackened thorns", "aoe": true },
      { "name": "Soul Drain", "damage": 7, "morale": -15, "chance": 0.25, "text": "drains the life and will from a soldier", "ignoreRow": true },
      { "name": "Swamp Call", "damage": 0, "morale": -25, "chance": 0.2, "text": "calls upon the swamp spirits" },
      { "name": "Root Grasp", "damage": 9, "chance": 0.25, "text": "commands roots to crush a soldier", "ignoreRow": true }
    ]
  }
};
