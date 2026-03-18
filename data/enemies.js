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
  },

  "cheruscan_guardian": {
    "id": "cheruscan_guardian", "name": "Cheruscan Guardian",
    "maxHp": 16, "row": "front", "damage": [3, 5], "speed": 1, "xpValue": 5,
    "description": "A disciplined warrior who fights defensively, shielding his brothers. Only strikes when cornered alone.",
    "ai": "defensive",
    "actions": [
      { "name": "Shield Cover", "damage": 0, "chance": 0.5, "text": "raises his shield, covering nearby warriors", "blockFrontRow": 2 },
      { "name": "Brace", "damage": 0, "chance": 0.3, "text": "braces behind his shield", "blockSelf": 3 },
      { "name": "Desperate Strike", "damage": 5, "chance": 0.2, "text": "strikes desperately" }
    ]
  },

  // === DIFFICULTY 2+ ENEMIES ===

  "germanic_berserker": {
    "id": "germanic_berserker", "name": "Germanic Berserker",
    "maxHp": 22, "row": "front", "damage": [5, 9], "speed": 2, "xpValue": 6,
    "minDifficulty": 2,
    "description": "A wild-eyed warrior who has chewed the sacred mushroom. Feels no pain and fights like a demon.",
    "ai": "aggressive",
    "actions": [
      { "name": "Frenzied Slash", "damage": 7, "chance": 0.4, "text": "slashes in a wild frenzy" },
      { "name": "Headbutt", "damage": 5, "morale": -5, "chance": 0.3, "text": "headbutts with a sickening crack" },
      { "name": "Blood Rage", "damage": 9, "chance": 0.2, "text": "howls and strikes with terrible force" },
      { "name": "Intimidating Scream", "damage": 0, "morale": -12, "chance": 0.1, "text": "screams, foam at the mouth" }
    ]
  },
  "silent_huntsman": {
    "id": "silent_huntsman", "name": "The Silent Huntsman",
    "maxHp": 50, "row": "back", "damage": [7, 12], "speed": 1, "xpValue": 22,
    "minDifficulty": 2,
    "isBoss": true, "ai": "boss",
    "description": "A scarred bowman who never misses. Trained by Arminius himself. His arrows find flesh through any defense.",
    "actions": [
      { "name": "Precise Shot", "damage": 8, "chance": 0.35, "text": "looses a precise arrow", "ignoreRow": true },
      { "name": "Marked Shot", "damage": 12, "chance": 0.25, "text": "fires at a marked target — the arrow punches through armor", "ignoreRow": true },
      { "name": "Arrow Rain", "damage": 5, "chance": 0.2, "text": "sends a volley of arrows into the Roman line", "aoe": true },
      { "name": "Hunter's Silence", "damage": 0, "morale": -18, "chance": 0.2, "text": "vanishes into shadow — the silence is deafening" }
    ]
  },

  // === DIFFICULTY 3+ ENEMIES ===

  "runecarver": {
    "id": "runecarver", "name": "Runecarver",
    "maxHp": 13, "row": "back", "damage": [2, 4], "speed": 1, "xpValue": 5,
    "minDifficulty": 3,
    "description": "A hunched Germanic craftsman who carves protective runes into shields before battle. His presence hardens the enemy line.",
    "ai": "sniper",
    "startBlockAllEnemies": 3,
    "actions": [
      { "name": "Rune Ward", "damage": 0, "chance": 0.5, "text": "carves a protective rune into a warrior's shield", "blockAllEnemies": 2 },
      { "name": "Rune Shard", "damage": 4, "chance": 0.3, "text": "hurls a sharpened rune-stone", "ignoreRow": true },
      { "name": "Curse Rune", "damage": 0, "morale": -8, "chance": 0.2, "text": "traces a curse rune in the air" }
    ]
  },

  "war_hound": {
    "id": "war_hound", "name": "War Hound",
    "maxHp": 16, "row": "front", "damage": [4, 7], "speed": 3, "xpValue": 5,
    "minDifficulty": 3,
    "description": "A massive dog bred for war, armored in boiled leather. Faster and meaner than any wolf.",
    "ai": "aggressive",
    "actions": [
      { "name": "Savage Bite", "damage": 5, "chance": 0.5, "text": "lunges with armored jaws" },
      { "name": "Hamstring", "damage": 4, "poisonTarget": 2, "chance": 0.3, "text": "tears at the legs, leaving a festering wound" },
      { "name": "Pack Howl", "damage": 0, "morale": -10, "chance": 0.2, "text": "howls — more answer from the dark" }
    ]
  },
  "mire_mother": {
    "id": "mire_mother", "name": "The Mire Mother",
    "maxHp": 60, "row": "front", "damage": [8, 14], "speed": 1, "xpValue": 25,
    "minDifficulty": 3,
    "isBoss": true, "ai": "boss",
    "description": "A massive swamp predator — half boar, half nightmare. Her young swarm at her call. She fights harder when they fall.",
    "actions": [
      { "name": "Gore Charge", "damage": 10, "chance": 0.3, "text": "charges with lowered tusks" },
      { "name": "Thrashing Fury", "damage": 7, "chance": 0.25, "text": "thrashes wildly, striking everything", "aoe": true },
      { "name": "Call the Brood", "damage": 0, "chance": 0.25, "text": "bellows into the swamp — her young answer", "spawn": "marsh_wolf" },
      { "name": "Mother's Wrath", "damage": 12, "morale": -10, "chance": 0.2, "text": "rears up and brings crushing weight down" }
    ]
  },

  // === DIFFICULTY 4+ ENEMIES ===

  "cursed_warrior": {
    "id": "cursed_warrior", "name": "Cursed Warrior",
    "maxHp": 20, "row": "front", "damage": [4, 8], "speed": 1, "xpValue": 6,
    "minDifficulty": 4,
    "deathPoison": 1,
    "description": "A Germanic warrior marked by the Bone Speaker's rituals. Black veins crawl across his skin. Even in death, he poisons.",
    "ai": "aggressive",
    "actions": [
      { "name": "Cursed Blade", "damage": 5, "poisonTarget": 2, "chance": 0.4, "text": "strikes with a blackened blade" },
      { "name": "Death Grip", "damage": 7, "chance": 0.3, "text": "grabs and squeezes with unnatural strength" },
      { "name": "Bone Rattle", "damage": 0, "morale": -12, "chance": 0.3, "text": "rattles the bones woven into his armor" }
    ]
  },
  "bone_speaker": {
    "id": "bone_speaker", "name": "The Bone Speaker",
    "maxHp": 40, "row": "back", "damage": [4, 8], "speed": 1, "xpValue": 25,
    "minDifficulty": 4,
    "isBoss": true, "ai": "boss",
    "description": "An ancient death-priest draped in human bones. He weakens the body, drains the will, and curses weapons. The longer you fight, the weaker you become.",
    "actions": [
      { "name": "Bone Curse", "damage": 3, "morale": -15, "poisonTarget": 2, "chance": 0.3, "text": "speaks a bone curse — pain and dread wash over a soldier", "ignoreRow": true },
      { "name": "Wither", "damage": 0, "morale": -20, "chance": 0.25, "text": "chants words of withering — your men feel their strength fade" },
      { "name": "Soul Shackle", "damage": 6, "morale": -10, "chance": 0.25, "text": "binds a soldier's spirit in chains of bone", "ignoreRow": true },
      { "name": "Raise the Dead", "damage": 0, "chance": 0.2, "text": "raises a cursed warrior from the mud", "spawn": "cursed_warrior" }
    ]
  }
};
