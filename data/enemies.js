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
      { "name": "Wild Slash", "damage": 7, "chance": 0.3, "text": "slashes wildly", "cooldown": 1 },
      { "name": "War Cry", "damage": 0, "morale": -6, "chance": 0.1, "text": "lets out a war cry" }
    ]
  },
  "sling_hunter": {
    "id": "sling_hunter", "name": "Sling Hunter",
    "maxHp": 12, "row": "back", "damage": [3, 5], "speed": 2, "xpValue": 4,
    "description": "Ranged skirmisher. Targets weakest unit.", "ai": "sniper",
    "actions": [
      { "name": "Sling Stone", "damage": 4, "chance": 0.7, "text": "hurls a sling stone", "ignoreRow": true },
      { "name": "Aimed Shot", "damage": 6, "chance": 0.2, "text": "takes careful aim", "ignoreRow": true, "cooldown": 1 },
      { "name": "Scatter Shot", "damage": 3, "chance": 0.1, "text": "fires scatter shot at the line", "aoe": true }
    ]
  },
  "marsh_wolf": {
    "id": "marsh_wolf", "name": "Marsh Wolf",
    "maxHp": 14, "row": "front", "damage": [3, 6], "speed": 3, "xpValue": 4,
    "description": "Fast predator. Attacks twice when wounded.", "ai": "aggressive",
    "woundedDoubleAttack": true,
    "actions": [
      { "name": "Bite", "damage": 4, "chance": 0.5, "text": "lunges with snapping jaws" },
      { "name": "Pounce", "damage": 6, "chance": 0.3, "text": "pounces", "cooldown": 1 },
      { "name": "Howl", "damage": 0, "morale": -6, "chance": 0.2, "text": "howls into the mist" }
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
      { "name": "Curse of Dread", "damage": 0, "morale": -10, "chance": 0.4, "text": "chants a dreadful curse" },
      { "name": "Marsh Hex", "damage": 3, "morale": -6, "chance": 0.3, "text": "hurls a hex of swamp fire", "ignoreRow": true },
      { "name": "Wail of the Dead", "damage": 0, "morale": -12, "chance": 0.2, "text": "screams with the voices of the dead", "cooldown": 2 },
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
      { "name": "Rallying Roar", "damage": 0, "morale": -8, "chance": 0.15, "text": "roars, rallying nearby warriors" },
      { "name": "Crushing Overhead", "damage": 12, "chance": 0.2, "text": "brings a devastating overhead blow", "cooldown": 1 }
    ]
  },
  "cheruscan_shieldbearer": {
    "id": "cheruscan_shieldbearer", "name": "Cheruscan Shieldbearer",
    "maxHp": 20, "row": "front", "damage": [3, 5], "speed": 1, "xpValue": 6,
    "description": "A broad-shouldered warrior crouching behind an oversized wicker-and-hide shield, covering those behind him.", "ai": "aggressive",
    "actions": [
      { "name": "Wall of Shields", "damage": 0, "chance": 0.4, "text": "raises the great shield, protecting nearby warriors", "blockAllEnemies": 3 },
      { "name": "Shield Slam", "damage": 5, "chance": 0.35, "text": "slams forward with the heavy shield" },
      { "name": "Taunt of Thusnelda", "damage": 0, "morale": -8, "chance": 0.25, "text": "screams the name of Arminius\u2019s wife \u2014 your men flinch" }
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
      { "name": "Blood Drain", "damage": 4, "poisonTarget": 2, "chance": 0.2, "text": "drains blood with a sickening pull", "cooldown": 1 }
    ]
  },
  "wicker_man": {
    "id": "wicker_man", "name": "Wicker Man",
    "maxHp": 25, "row": "back", "damage": [2, 2], "speed": 0, "xpValue": 8,
    "description": "A towering effigy of woven branches, set ablaze by Germanic priests. The smoke chokes the air and shields nearby warriors.", "ai": "passive",
    "isStructure": true, "aura": { "damageReduction": 2 }, "turnDamageAll": 2, "deathDamageEnemy": 6,
    "actions": [
      { "name": "Burning Effigy", "damage": 0, "chance": 1.0, "text": "burns — all soldiers take 2 damage per turn, and nearby enemies take 2 less damage from attacks" }
    ]
  },
  "revenant_of_ariovistus": {
    "id": "revenant_of_ariovistus", "name": "Revenant of Ariovistus",
    "maxHp": 55, "row": "back", "damage": [8, 14], "speed": 2, "xpValue": 25,
    "description": "The dead king commands from behind his court. His ranged strikes are weaker, but when his guardians fall he strides forward — crowned in rust and fury, consuming the bones of the fallen to grow stronger.",
    "ai": "aggressive",
    "actions": [
      { "name": "King's Wrath", "damage": 11, "chance": 0.3, "text": "strikes with the fury of a dead kingdom", "phase": "melee" },
      { "name": "Grave Command", "damage": 4, "morale": -8, "chance": 0.3, "text": "points from the shadows — dread washes over a soldier", "ignoreRow": true, "phase": "ranged" },
      { "name": "Barrow Chill", "damage": 5, "morale": -10, "chance": 0.2, "text": "breathes the cold of the grave", "aoe": true, "cooldown": 1 },
      { "name": "Raise Guardian", "damage": 0, "chance": 0.2, "text": "claws at the earth — bones reassemble", "spawn": "barrow_guardian" },
      { "name": "Crown of the Dead", "damage": 0, "chance": 0.15, "text": "raises his crown — the grave answers", "blockSelf": 10, "morale": -6, "phase": "ranged" },
      { "name": "Grave Strike", "damage": 9, "chance": 0.15, "text": "lunges from the darkness", "phase": "melee" }
    ],
    "phaseShift": { "afterTurns": 99, "toRow": "front" }
  },
  "barrow_guardian": {
    "id": "barrow_guardian", "name": "Barrow Guardian",
    "maxHp": 14, "row": "front", "damage": [4, 7], "speed": 1, "xpValue": 3,
    "description": "Skeletal warriors bound to the king in death. When they fall, Ariovistus consumes their essence — healing himself and growing stronger.",
    "ai": "aggressive",
    "actions": [
      { "name": "Bone Claw", "damage": 5, "chance": 0.5, "text": "rakes with bony claws" },
      { "name": "Grave Grasp", "damage": 3, "chance": 0.3, "text": "drags at a soldier's legs", "morale": -4 },
      { "name": "Shield the King", "damage": 0, "chance": 0.2, "text": "throws itself before the king", "blockAllEnemies": 3 }
    ]
  },
  "arminius_champion": {
    "id": "arminius_champion", "name": "Arminius's Champion",
    "maxHp": 55, "row": "front", "damage": [8, 14], "speed": 2, "xpValue": 20,
    "isBoss": true, "ai": "boss",
    "actions": [
      { "name": "Crushing Blow", "damage": 10, "chance": 0.4, "text": "brings down a crushing blow" },
      { "name": "Shield Bash", "damage": 6, "chance": 0.25, "text": "bashes with iron shield" },
      { "name": "War Cry", "damage": 0, "morale": -12, "chance": 0.15, "text": "roars a war cry" },
      { "name": "Frenzy", "damage": 8, "chance": 0.2, "text": "attacks in a frenzy", "aoe": true, "cooldown": 1 }
    ]
  },
  "grove_witch": {
    "id": "grove_witch", "name": "Grove Witch",
    "maxHp": 45, "row": "back", "damage": [5, 10], "speed": 1, "xpValue": 22,
    "isBoss": true, "ai": "boss",
    "description": "A twisted figure wreathed in green flame, half-woman, half-forest. She commands root and thorn, drains the will from soldiers, and summons healing totems from the living earth. The longer she lives, the stronger the forest grows around her.",
    "actions": [
      { "name": "Thorn Volley", "damage": 5, "chance": 0.3, "text": "sends a volley of blackened thorns", "aoe": true },
      { "name": "Soul Drain", "damage": 7, "morale": -10, "chance": 0.25, "text": "drains the life and will from a soldier", "ignoreRow": true },
      { "name": "Swamp Call", "damage": 0, "morale": -15, "chance": 0.2, "text": "calls upon the swamp spirits", "cooldown": 2 },
      { "name": "Root Grasp", "damage": 9, "chance": 0.25, "text": "commands roots to crush a soldier", "ignoreRow": true, "cooldown": 1 }
    ]
  },

  "cheruscan_guardian": {
    "id": "cheruscan_guardian", "name": "Cheruscan Guardian",
    "maxHp": 14, "row": "front", "damage": [3, 5], "speed": 1, "xpValue": 5,
    "description": "A disciplined warrior who fights defensively, shielding his brothers. Only strikes when cornered alone. Enters battle braced.",
    "ai": "defensive",
    "startWithSelfBlock": true,
    "actions": [
      { "name": "Shield Cover", "damage": 0, "chance": 0.5, "text": "raises his shield, covering nearby warriors", "blockFrontRow": 4 },
      { "name": "Brace", "damage": 0, "chance": 0.3, "text": "braces behind his shield", "blockSelf": 4 },
      { "name": "Desperate Strike", "damage": 5, "chance": 0.2, "text": "strikes desperately" }
    ]
  },

  // === DIFFICULTY 2+ ENEMIES ===

  "spear_thrower": {
    "id": "spear_thrower", "name": "Germanic Spearman",
    "maxHp": 18, "row": "back", "damage": [4, 7], "speed": 2, "xpValue": 5,
    "minDifficulty": 2,
    "description": "A versatile warrior who hurls spears from the back line before charging into melee. After 2 turns of throwing, he rushes to the front with his last spear.",
    "ai": "aggressive",
    "phaseShift": { "afterTurns": 2, "toRow": "front" },
    "actions": [
      { "name": "Spear Throw", "damage": 5, "chance": 0.6, "text": "hurls a spear with deadly aim", "ignoreRow": true, "phase": "ranged" },
      { "name": "Double Throw", "damage": 4, "chance": 0.4, "text": "hurls two spears in quick succession", "ignoreRow": true, "multiTarget": 2, "phase": "ranged" },
      { "name": "Spear Thrust", "damage": 6, "chance": 0.5, "text": "thrusts with his last spear", "phase": "melee" },
      { "name": "Shield Bash", "damage": 4, "morale": -4, "chance": 0.3, "text": "bashes with a makeshift shield", "phase": "melee" },
      { "name": "Wild Charge", "damage": 8, "chance": 0.2, "text": "charges with reckless fury", "cooldown": 1, "phase": "melee" }
    ]
  },

  "germanic_berserker": {
    "id": "germanic_berserker", "name": "Germanic Berserker",
    "maxHp": 22, "row": "front", "damage": [5, 9], "speed": 2, "xpValue": 6,
    "minDifficulty": 2,
    "description": "A wild-eyed warrior who has chewed the sacred mushroom. Feels no pain and fights like a demon. The more wounded he is, the harder he hits.",
    "ai": "aggressive",
    "berserkRage": true,
    "actions": [
      { "name": "Frenzied Slash", "damage": 7, "chance": 0.4, "text": "slashes in a wild frenzy" },
      { "name": "Headbutt", "damage": 5, "morale": -4, "chance": 0.3, "text": "headbutts with a sickening crack" },
      { "name": "Blood Rage", "damage": 9, "chance": 0.2, "text": "howls and strikes with terrible force", "cooldown": 1 },
      { "name": "Intimidating Scream", "damage": 0, "morale": -8, "chance": 0.1, "text": "screams, foam at the mouth" }
    ]
  },
  "silent_huntsman": {
    "id": "silent_huntsman", "name": "The Silent Huntsman",
    "maxHp": 50, "row": "back", "damage": [7, 12], "speed": 1, "xpValue": 22,
    "minDifficulty": 2,
    "isBoss": true, "ai": "boss",
    "description": "A scarred bowman who never misses. Trained by Arminius himself. He marks his prey, then strikes with lethal precision.",
    "actions": [
      { "name": "Precise Shot", "damage": 8, "chance": 0.3, "text": "looses a precise arrow", "ignoreRow": true },
      { "name": "Mark Prey", "damage": 3, "chance": 0.3, "text": "studies a target — marking them for death", "ignoreRow": true, "markTarget": true, "morale": -6 },
      { "name": "Marked Shot", "damage": 14, "chance": 0.25, "text": "fires at a marked target — the arrow punches through armor", "ignoreRow": true, "cooldown": 1, "pierceBlock": true },
      { "name": "Arrow Rain", "damage": 5, "chance": 0.15, "text": "sends a volley of arrows into the Roman line", "aoe": true, "cooldown": 1 }
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
      { "name": "Curse Rune", "damage": 0, "morale": -6, "chance": 0.2, "text": "traces a curse rune in the air" }
    ]
  },

  "ironbound_champion": {
    "id": "ironbound_champion", "name": "Ironbound Champion",
    "maxHp": 24, "row": "front", "damage": [8, 16], "speed": 1, "xpValue": 7,
    "minDifficulty": 3,
    "description": "A warrior encased in layers of scavenged shields and iron plate. He builds his defenses, then unleashes them in a single devastating charge. Kill him before the shieldbearers make him unstoppable.",
    "ai": "aggressive",
    "actions": [
      { "name": "Iron Brace", "damage": 0, "chance": 0.35, "text": "hunkers behind layered shields", "blockSelf": 8 },
      { "name": "Shield Charge", "damage": 5, "chance": 0.35, "text": "charges forward, smashing with his shield wall", "damageFromBlock": true },
      { "name": "Crushing Slam", "damage": 10, "chance": 0.3, "text": "brings an armored fist down" }
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
      { "name": "Pack Howl", "damage": 0, "morale": -6, "chance": 0.2, "text": "howls — more answer from the dark" }
    ]
  },
  "mire_mother": {
    "id": "mire_mother", "name": "The Mire Mother",
    "maxHp": 60, "row": "front", "damage": [8, 14], "speed": 1, "xpValue": 25,
    "minDifficulty": 3,
    "isBoss": true, "ai": "boss",
    "description": "A monstrous sow, ancient and scarred, draped in mud and fury. Her boar brood swarms at her call. Kill her young and she grows deadlier.",
    "actions": [
      { "name": "Gore Charge", "damage": 10, "chance": 0.3, "text": "charges with lowered tusks" },
      { "name": "Thrashing Fury", "damage": 7, "chance": 0.25, "text": "thrashes wildly, striking everything", "aoe": true },
      { "name": "Call the Brood", "damage": 0, "chance": 0.20, "text": "bellows into the swamp — her young answer", "spawn": "boar_youngling", "cooldown": 5 },
      { "name": "Mother's Wrath", "damage": 12, "morale": -8, "chance": 0.2, "text": "rears up and brings crushing weight down", "cooldown": 1 }
    ]
  },

  "boar_youngling": {
    "id": "boar_youngling", "name": "Boar Youngling",
    "maxHp": 10, "row": "front", "damage": [2, 4], "speed": 3, "xpValue": 3,
    "minDifficulty": 3,
    "description": "A squealing piglet with razor tusks. Small but vicious in packs. The Mire Mother's brood.",
    "ai": "aggressive",
    "actions": [
      { "name": "Tusk Nip", "damage": 3, "chance": 0.6, "text": "nips with small sharp tusks" },
      { "name": "Squeal", "damage": 0, "morale": -4, "chance": 0.2, "text": "squeals — a piercing sound that rattles nerves" },
      { "name": "Swarm Bite", "damage": 4, "chance": 0.2, "text": "bites with surprising ferocity" }
    ]
  },

  "war_boar": {
    "id": "war_boar", "name": "War Boar",
    "maxHp": 20, "row": "back", "damage": [5, 8], "speed": 2, "xpValue": 6,
    "minDifficulty": 3,
    "description": "A massive bristle-backed boar, armored in mud and rage. It waits in the rear before charging with devastating force.",
    "ai": "aggressive",
    "phaseShift": { "afterTurns": 99, "toRow": "front" },
    "actions": [
      { "name": "Snort", "damage": 0, "morale": -5, "chance": 0.4, "text": "snorts and stamps, building fury", "phase": "ranged" },
      { "name": "Mud Sling", "damage": 3, "chance": 0.6, "text": "flings mud and debris", "ignoreRow": true, "phase": "ranged" },
      { "name": "Boar Charge", "damage": 7, "chance": 0.3, "text": "charges from the back line with devastating force", "cooldown": 4, "boarCharge": true },
      { "name": "Gore", "damage": 6, "chance": 0.4, "text": "gores with massive tusks", "phase": "melee" },
      { "name": "Trample", "damage": 4, "chance": 0.3, "text": "tramples underfoot", "aoe": true, "phase": "melee" }
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
      { "name": "Death Grip", "damage": 7, "chance": 0.3, "text": "grabs and squeezes with unnatural strength", "cooldown": 1 },
      { "name": "Bone Rattle", "damage": 0, "morale": -8, "chance": 0.3, "text": "rattles the bones woven into his armor" }
    ]
  },
  "bone_speaker": {
    "id": "bone_speaker", "name": "The Bone Speaker",
    "maxHp": 40, "row": "back", "damage": [4, 8], "speed": 1, "xpValue": 25,
    "minDifficulty": 4,
    "isBoss": true, "ai": "boss",
    "description": "An ancient death-priest draped in human bones. He weakens the body, drains the will, and curses weapons. The longer you fight, the weaker you become.",
    "actions": [
      { "name": "Bone Curse", "damage": 3, "morale": -10, "poisonTarget": 7, "chance": 0.3, "text": "speaks a bone curse — pain and dread wash over a soldier", "ignoreRow": true },
      { "name": "Wither", "damage": 0, "morale": -12, "chance": 0.25, "text": "chants words of withering — your men feel their strength fade" },
      { "name": "Soul Shackle", "damage": 17, "morale": -8, "chance": 0.25, "text": "binds a soldier's spirit in chains of bone", "ignoreRow": true, "cooldown": 1 },
      { "name": "Raise the Dead", "damage": 0, "chance": 0.2, "text": "raises a cursed warrior from the mud", "spawn": "cursed_warrior" }
    ]
  },

  "serpent_shaman": {
    "id": "serpent_shaman", "name": "Serpent Shaman",
    "maxHp": 42, "row": "back", "damage": [5, 10], "speed": 2, "xpValue": 25,
    "minDifficulty": 3,
    "isBoss": true, "ai": "boss",
    "description": "A painted shaman who dances between the lines, swapping places with her serpents. Fen vipers obey her call. Her venom weakens the body while her chants shatter the mind. Pin her down — if you can.",
    "actions": [
      { "name": "Venom Spit", "damage": 4, "poisonTarget": 4, "chance": 0.3, "text": "spits a stream of dark venom", "ignoreRow": true },
      { "name": "Serpent Dance", "damage": 0, "chance": 0.2, "text": "dances — swapping places with a serpent" },
      { "name": "Fang Strike", "damage": 9, "poisonTarget": 3, "chance": 0.25, "text": "lunges with a fanged staff" },
      { "name": "Venom Cloud", "damage": 3, "poisonTarget": 2, "chance": 0.25, "text": "exhales a cloud of poison", "aoe": true, "cooldown": 1 }
    ]
  },
  "serpent_shade": {
    "id": "serpent_shade", "name": "Serpent Shade",
    "maxHp": 10, "row": "front", "damage": [2, 4], "speed": 1, "xpValue": 2,
    "description": "A spectral snake left behind by the Shaman's dance. It bites once, then dissolves.",
    "ai": "aggressive",
    "actions": [
      { "name": "Phantom Bite", "damage": 3, "poisonTarget": 2, "chance": 1.0, "text": "strikes with ghostly fangs" }
    ]
  },

  "fog_weaver": {
    "id": "fog_weaver", "name": "The Fog Weaver",
    "maxHp": 38, "row": "back", "damage": [4, 8], "speed": 1, "xpValue": 27,
    "minDifficulty": 5,
    "isBoss": true, "ai": "boss",
    "description": "A spectral seeress who fights from behind a veil of fog. Attacks miss, dice fail, and illusions draw your steel. You must cut through the fog to reach the weaver within.",
    "actions": [
      { "name": "Mind Shatter", "damage": 6, "morale": -10, "chance": 0.3, "text": "reaches into a soldier's mind and tears", "ignoreRow": true },
      { "name": "Fog Pulse", "damage": 4, "chance": 0.25, "text": "sends a pulse of fog that chills the blood", "aoe": true },
      { "name": "Weave Illusion", "damage": 0, "chance": 0.25, "text": "weaves a fog illusion to fight for her", "spawn": "fog_illusion" },
      { "name": "Hex", "damage": 0, "morale": -12, "chance": 0.2, "text": "speaks a hex — a die crumbles to dust", "cooldown": 1 }
    ]
  },
  "fog_illusion": {
    "id": "fog_illusion", "name": "Fog Illusion",
    "maxHp": 16, "row": "front", "damage": [3, 5], "speed": 1, "xpValue": 1,
    "description": "A shape in the fog that looks like a warrior but dissolves when struck. It draws attacks away from the Weaver.",
    "ai": "aggressive",
    "actions": [
      { "name": "Phantom Strike", "damage": 4, "chance": 0.7, "text": "lashes out with foggy tendrils" },
      { "name": "Fade", "damage": 0, "morale": -4, "chance": 0.3, "text": "shimmers and fades — your men swing at nothing" }
    ]
  },

  "blood_stag": {
    "id": "blood_stag", "name": "The Blood Stag",
    "maxHp": 58, "row": "front", "damage": [7, 14], "speed": 2, "xpValue": 28,
    "minDifficulty": 6,
    "isBoss": true, "ai": "boss",
    "description": "A monstrous stag wreathed in dripping crimson. Worshipped as a forest god by the tribes. It charges, gores, and tramples — then retreats to the back line to regenerate. Its antlers leave wounds that never stop bleeding.",
    "actions": [
      { "name": "Gore", "damage": 10, "chance": 0.3, "text": "gores with blood-soaked antlers" },
      { "name": "Trample", "damage": 7, "chance": 0.25, "text": "tramples everything in its path", "aoe": true, "cooldown": 1 },
      { "name": "Antler Rake", "damage": 8, "poisonTarget": 3, "chance": 0.25, "text": "rakes with cursed antlers — wounds bleed freely" },
      { "name": "Retreat", "damage": 0, "chance": 0.2, "text": "leaps to the treeline and begins to heal" }
    ]
  },

  // === MID-LATE TIER ENEMIES ===

  "shadow_stalker": {
    "id": "shadow_stalker", "name": "Shadow Stalker",
    "maxHp": 16, "row": "back", "damage": [5, 9], "speed": 3, "xpValue": 7,
    "minDifficulty": 4,
    "description": "A forest assassin who strikes from the shadows. Fast, fragile, and always targeting the weakest.",
    "ai": "sniper",
    "actions": [
      { "name": "Shadow Strike", "damage": 8, "chance": 0.5, "text": "lunges from the shadows at the weakest soldier", "ignoreRow": true },
      { "name": "Vanish", "damage": 0, "chance": 0.3, "text": "melts into the darkness", "blockSelf": 6 },
      { "name": "Throat Cut", "damage": 12, "chance": 0.2, "text": "slits a throat from behind", "ignoreRow": true, "cooldown": 2 }
    ]
  },
  "plague_bearer": {
    "id": "plague_bearer", "name": "Plague Bearer",
    "maxHp": 20, "row": "front", "damage": [3, 6], "speed": 1, "xpValue": 6,
    "minDifficulty": 4,
    "description": "A diseased warrior who poisons everything he touches. When he dies, his plague spreads to all soldiers.",
    "ai": "aggressive",
    "deathPoison": 3,
    "actions": [
      { "name": "Plague Touch", "damage": 4, "poisonTarget": 4, "chance": 0.5, "text": "grasps with rotting hands" },
      { "name": "Bile Spray", "damage": 3, "poisonTarget": 2, "chance": 0.3, "text": "spews bile across the line", "aoe": true, "cooldown": 1 },
      { "name": "Festering Wound", "damage": 6, "poisonTarget": 5, "chance": 0.2, "text": "drives a rusted blade deep" }
    ]
  },
  "warden_of_the_deep": {
    "id": "warden_of_the_deep", "name": "Warden of the Deep",
    "maxHp": 28, "row": "front", "damage": [6, 11], "speed": 1, "xpValue": 8,
    "minDifficulty": 5,
    "description": "An ancient forest guardian bound in living bark. Immensely tough. Reduces damage to all nearby enemies.",
    "ai": "defensive",
    "aura": { "damageReduction": 2 },
    "startWithSelfBlock": true,
    "actions": [
      { "name": "Root Slam", "damage": 8, "chance": 0.4, "text": "slams with gnarled roots" },
      { "name": "Bark Shield", "damage": 0, "chance": 0.35, "text": "hardens its bark — all allies brace", "blockAllEnemies": 4, "blockSelf": 6 },
      { "name": "Entangle", "damage": 5, "morale": -6, "chance": 0.25, "text": "wraps roots around a soldier" }
    ]
  },
  "raven_caller": {
    "id": "raven_caller", "name": "Raven Caller",
    "maxHp": 14, "row": "back", "damage": [3, 6], "speed": 2, "xpValue": 7,
    "minDifficulty": 5,
    "description": "A gaunt seer who commands flocks of ravens. His crows peck at eyes and shred nerves.",
    "ai": "sniper",
    "actions": [
      { "name": "Raven Swarm", "damage": 4, "morale": -6, "chance": 0.4, "text": "sends a flock of ravens at a soldier's face", "ignoreRow": true },
      { "name": "Eye Peck", "damage": 6, "chance": 0.3, "text": "a raven dives for the eyes", "ignoreRow": true },
      { "name": "Murder of Crows", "damage": 3, "morale": -4, "chance": 0.3, "text": "a storm of black feathers descends", "aoe": true, "cooldown": 1 }
    ]
  },
  "blood_druid": {
    "id": "blood_druid", "name": "Blood Druid",
    "maxHp": 22, "row": "back", "damage": [4, 8], "speed": 1, "xpValue": 8,
    "minDifficulty": 6,
    "description": "A druid who heals allies with blood magic, draining the life from your soldiers to mend his own.",
    "ai": "sniper",
    "actions": [
      { "name": "Blood Siphon", "damage": 6, "chance": 0.35, "text": "drains life from a soldier", "ignoreRow": true },
      { "name": "Crimson Ward", "damage": 0, "chance": 0.3, "text": "weaves a ward of blood — allies brace", "blockAllEnemies": 5 },
      { "name": "Hemorrhage", "damage": 4, "poisonTarget": 4, "chance": 0.2, "text": "opens wounds that won't close", "ignoreRow": true },
      { "name": "Blood Offering", "damage": 0, "chance": 0.15, "text": "sacrifices his own blood to strengthen an ally", "blockSelf": -3 }
    ]
  },
  "ironhide_boar": {
    "id": "ironhide_boar", "name": "Ironhide Boar",
    "maxHp": 30, "row": "front", "damage": [7, 12], "speed": 1, "xpValue": 8,
    "minDifficulty": 6,
    "description": "A massive boar with hide like iron plate. Its charge shatters shields and bones alike.",
    "ai": "aggressive",
    "actions": [
      { "name": "Tusk Gore", "damage": 9, "chance": 0.4, "text": "gores with iron-hard tusks" },
      { "name": "Iron Charge", "damage": 7, "chance": 0.35, "text": "charges through the line", "aoe": true, "cooldown": 1 },
      { "name": "Stomp", "damage": 11, "chance": 0.25, "text": "tramples a soldier underfoot" }
    ]
  },
  "forest_wraith": {
    "id": "forest_wraith", "name": "Forest Wraith",
    "maxHp": 18, "row": "back", "damage": [5, 9], "speed": 2, "xpValue": 9,
    "minDifficulty": 7,
    "description": "A spectral figure that drifts through the trees. Its touch drains will and warmth. Nearly impossible to pin down.",
    "ai": "sniper",
    "actions": [
      { "name": "Spectral Touch", "damage": 7, "morale": -8, "chance": 0.4, "text": "reaches through flesh with ghostly hands", "ignoreRow": true },
      { "name": "Wail", "damage": 0, "morale": -12, "chance": 0.3, "text": "lets loose a wail that freezes the blood", "cooldown": 1 },
      { "name": "Life Drain", "damage": 9, "chance": 0.3, "text": "drains the warmth from a soldier", "ignoreRow": true }
    ]
  },
  "death_champion": {
    "id": "death_champion", "name": "Death Champion",
    "maxHp": 32, "row": "front", "damage": [8, 14], "speed": 2, "xpValue": 10,
    "minDifficulty": 7,
    "description": "A fallen warrior raised by dark power. He fights with the skill of a veteran and the relentlessness of the dead.",
    "ai": "aggressive",
    "woundedDoubleAttack": true,
    "actions": [
      { "name": "Deathblow", "damage": 12, "chance": 0.35, "text": "delivers a crushing strike" },
      { "name": "Reaping Sweep", "damage": 8, "chance": 0.3, "text": "sweeps a blade through the front line", "aoe": true, "cooldown": 1 },
      { "name": "Undying Fury", "damage": 10, "morale": -6, "chance": 0.2, "text": "attacks with inhuman ferocity" },
      { "name": "Shield of Bone", "damage": 0, "chance": 0.15, "text": "raises a shield of dead bone", "blockSelf": 8 }
    ]
  },
  "elder_seer": {
    "id": "elder_seer", "name": "Elder Seer",
    "maxHp": 16, "row": "back", "damage": [3, 6], "speed": 1, "xpValue": 9,
    "minDifficulty": 8,
    "description": "An ancient seer whose curses are absolute. She speaks, and soldiers forget how to fight.",
    "ai": "sniper",
    "deathMoraleMultiplier": 3,
    "actions": [
      { "name": "Doom Word", "damage": 5, "morale": -10, "chance": 0.35, "text": "speaks a word of doom", "ignoreRow": true },
      { "name": "Fate Unraveled", "damage": 0, "morale": -15, "chance": 0.25, "text": "unravels fate itself — your men despair", "cooldown": 2 },
      { "name": "Curse of Weakness", "damage": 3, "poisonTarget": 5, "chance": 0.25, "text": "curses a soldier with wasting sickness", "ignoreRow": true },
      { "name": "Spirit Ward", "damage": 0, "chance": 0.15, "text": "weaves a ward over her allies", "blockAllEnemies": 6 }
    ]
  },

  // === STORY BOSSES ===

  "corpse_of_arminius": {
    "id": "corpse_of_arminius", "name": "Corpse of Arminius",
    "maxHp": 65, "row": "front", "damage": [8, 14], "speed": 2, "xpValue": 30,
    "minDifficulty": 6,
    "isBoss": true, "ai": "boss",
    "description": "The reanimated corpse of the Germanic chieftain who destroyed three Roman legions at Teutoburg. He wears Roman training armor, corrupted by death. His discipline is inhuman.",
    "actions": [
      { "name": "Betrayer's Blade", "damage": 12, "chance": 0.3, "text": "strikes with the blade that betrayed Rome" },
      { "name": "Legionary Drill", "damage": 8, "chance": 0.25, "text": "executes a Roman drill strike against the whole line", "aoe": true, "cooldown": 1 },
      { "name": "Ghost Command", "damage": 0, "chance": 0.2, "text": "raises a hand — a cursed warrior claws from the mud", "spawn": "cursed_warrior" },
      { "name": "Death's Discipline", "damage": 0, "chance": 0.25, "text": "barks a dead command — his warriors brace", "blockAllEnemies": 4, "blockSelf": 6 }
    ]
  },

  "corpse_of_varus": {
    "id": "corpse_of_varus", "name": "Corpse of Varus",
    "maxHp": 50, "row": "back", "damage": [6, 12], "speed": 1, "xpValue": 35,
    "minDifficulty": 8,
    "isBoss": true, "ai": "boss",
    "description": "The corrupted spirit of Publius Quinctilius Varus, the Roman general who led his legions to slaughter. He commands the dead from the back row, whispering Rome's failure.",
    "actions": [
      { "name": "Commander's Lash", "damage": 7, "morale": -10, "chance": 0.3, "text": "lashes out with spectral authority", "ignoreRow": true },
      { "name": "Rally the Dead", "damage": 0, "chance": 0.2, "text": "raises a hand — the dead answer his command", "spawn": "cursed_warrior" },
      { "name": "Shield Formation", "damage": 0, "chance": 0.25, "text": "commands a ghostly formation — all warriors brace", "blockAllEnemies": 6 },
      { "name": "Varus's Shame", "damage": 0, "morale": -15, "chance": 0.25, "text": "whispers of Rome's failure — your men's resolve crumbles", "cooldown": 2 }
    ]
  },

  "spirit_of_arminius": {
    "id": "spirit_of_arminius", "name": "Spirit of Arminius",
    "maxHp": 45, "row": "front", "damage": [8, 14], "speed": 2, "xpValue": 40,
    "minDifficulty": 10,
    "isBoss": true, "ai": "boss",
    "description": "The defiant spirit of Arminius, bound to Varus in death. They cannot be separated — damaging one heals the other. Both must fall.",
    "actions": [
      { "name": "Phantom Blade", "damage": 10, "chance": 0.35, "text": "slashes with a spectral blade" },
      { "name": "Spirit Charge", "damage": 7, "chance": 0.25, "text": "charges through the line as a ghost", "aoe": true, "cooldown": 1 },
      { "name": "Defiance", "damage": 0, "morale": -10, "chance": 0.2, "text": "roars defiance — his spirit hardens", "blockSelf": 8 },
      { "name": "Wrath of the Forest", "damage": 12, "poisonTarget": 3, "chance": 0.2, "text": "channels the forest's wrath", "ignoreRow": true }
    ]
  },

  "spirit_of_varus": {
    "id": "spirit_of_varus", "name": "Spirit of Varus",
    "maxHp": 40, "row": "back", "damage": [5, 10], "speed": 1, "xpValue": 40,
    "minDifficulty": 10,
    "isBoss": true, "ai": "boss",
    "description": "The guilt-wracked spirit of Varus, bound to Arminius in death. They cannot be separated — damaging one heals the other. Both must fall.",
    "actions": [
      { "name": "Spectral Command", "damage": 6, "morale": -10, "chance": 0.3, "text": "commands from beyond the grave", "ignoreRow": true },
      { "name": "Legion's Ghost", "damage": 5, "chance": 0.25, "text": "summons the ghosts of the lost legions", "aoe": true },
      { "name": "Guilt's Embrace", "damage": 0, "morale": -12, "chance": 0.2, "text": "drowns your men in the weight of Rome's guilt", "cooldown": 1 },
      { "name": "Death's Verdict", "damage": 14, "chance": 0.25, "text": "passes a final verdict from beyond death", "ignoreRow": true, "cooldown": 1 }
    ]
  }
};
