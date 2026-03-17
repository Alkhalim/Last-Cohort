// ============================================================
// Last Cohort – Embedded Game Data (replaces JSON fetch)
// ============================================================

const RAW_CLASSES = {
  "legionary": {
    "name": "Legionary",
    "title": "LEG",
    "maxHp": 32,
    "tags": ["heavy", "roman"],
    "description": "Heavy infantry. Reliable damage and strong defense.",
    "passive": {
      "name": "Shield Discipline",
      "description": "First defensive action with a 4+ die each encounter grants +4 extra Block.",
      "triggered": false
    },
    "skills": [
      {
        "id": "strike",
        "name": "Strike",
        "starter": true,
        "cost": { "type": "any" },
        "target": "single_enemy",
        "description": "Basic sword strike. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "shield_brace",
        "name": "Shield Brace",
        "starter": true,
        "cost": { "type": "threshold", "min": 2 },
        "target": "self",
        "description": "Gain 5 Block. (4+ triggers Shield Discipline for +4.)",
        "effects": { "block": 5 },
        "passiveTrigger": { "dieMin": 4, "bonusBlock": 4 }
      },
      {
        "id": "gladius_thrust",
        "name": "Gladius Thrust",
        "starter": true,
        "cost": { "type": "threshold", "min": 3 },
        "target": "single_enemy",
        "description": "Precise thrust. Deals 6 damage.",
        "effects": { "damage": 6 }
      },
      {
        "id": "hold_fast",
        "name": "Hold Fast",
        "cost": { "type": "exact", "val": 4 },
        "target": "self",
        "description": "Gain 8 Block and Taunt (enemies target this unit).",
        "effects": { "block": 8, "taunt": true }
      },
      {
        "id": "pilum_cast",
        "name": "Pilum Cast",
        "cost": { "type": "threshold", "min": 5 },
        "target": "single_enemy",
        "ignoreRow": true,
        "description": "Throw pilum at any row. Deals 9 damage.",
        "effects": { "damage": 9, "ignoreRow": true }
      },
      {
        "id": "twin_slash",
        "name": "Twin Slash",
        "cost": { "type": "combined", "min": 5, "dice": 2 },
        "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 10 damage.",
        "effects": { "damage": 10 }
      },
      {
        "id": "shield_wall",
        "name": "Shield Wall",
        "cost": { "type": "combined", "min": 8, "dice": 2 },
        "target": "all_allies",
        "description": "2 dice totaling 8+. All allies gain 6 Block.",
        "effects": { "blockAll": 6 }
      }
    ]
  },
  "centurion": {
    "name": "Centurion",
    "title": "CEN",
    "maxHp": 28,
    "tags": ["command", "roman"],
    "description": "Officer. Buffs allies and controls the battlefield.",
    "passive": {
      "name": "Discipline of Office",
      "description": "Once per turn, adjust one die by +1 or -1.",
      "usedThisTurn": false
    },
    "skills": [
      {
        "id": "strike",
        "name": "Strike",
        "starter": true,
        "cost": { "type": "any" },
        "target": "single_enemy",
        "description": "Basic strike. Deals 2 damage.",
        "effects": { "damage": 2 }
      },
      {
        "id": "commanding_shout",
        "name": "Commanding Shout",
        "starter": true,
        "cost": { "type": "exact", "val": 3 },
        "target": "all_allies",
        "description": "All allies gain +2 damage on their next attack.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 1 } }
      },
      {
        "id": "reform_the_line",
        "name": "Reform the Line",
        "starter": true,
        "cost": { "type": "threshold", "min": 4 },
        "target": "all_allies",
        "description": "All allies gain 3 Block.",
        "effects": { "blockAll": 3 }
      },
      {
        "id": "officers_care",
        "name": "Officer's Care",
        "cost": { "type": "threshold", "min": 2 },
        "target": "all_allies",
        "description": "All allies heal 1 HP and gain +1 damage on next attack.",
        "effects": { "healAll": 1, "buffAllies": { "bonusDamage": 1, "attacks": 1 } }
      },
      {
        "id": "measured_advance",
        "name": "Measured Advance",
        "cost": { "type": "combined", "min": 7, "dice": 2 },
        "target": "single_enemy",
        "description": "2 dice totaling 7+. Deals 11 damage.",
        "effects": { "damage": 11 }
      },
      {
        "id": "no_retreat",
        "name": "No Retreat",
        "cost": { "type": "exact", "val": 6 },
        "target": "all_allies",
        "description": "All allies gain 5 Block and +10 Morale.",
        "effects": { "blockAll": 5, "morale": 10 }
      },
      {
        "id": "rally_cry",
        "name": "Rally Cry",
        "cost": { "type": "combined", "min": 6, "dice": 2 },
        "target": "all_allies",
        "description": "2 dice totaling 6+. +15 Morale and +1 damage for next 2 attacks.",
        "effects": { "morale": 15, "buffAllies": { "bonusDamage": 1, "attacks": 2 } }
      },
      {
        "id": "decimation_strike",
        "name": "Decimation Strike",
        "cost": { "type": "combinedExact", "val": 7, "dice": 2 },
        "target": "single_enemy",
        "description": "2 dice totaling exactly 7. Deals 15 damage.",
        "effects": { "damage": 15 }
      }
    ]
  },
  "medicus": {
    "name": "Medicus",
    "title": "MED",
    "maxHp": 22,
    "tags": ["support", "roman"],
    "description": "Field surgeon. Heals, poisons, and manages attrition.",
    "passive": {
      "name": "Field Triage",
      "description": "When an ally is downed, gain one free Bind Wounds this encounter.",
      "freeHealAvailable": false
    },
    "skills": [
      {
        "id": "bind_wounds",
        "name": "Bind Wounds",
        "starter": true,
        "cost": { "type": "threshold", "min": 2 },
        "target": "single_ally",
        "description": "Heal an ally for 3 HP.",
        "effects": { "heal": 3 }
      },
      {
        "id": "aconitum",
        "name": "Aconitum",
        "starter": true,
        "cost": { "type": "any" },
        "target": "single_enemy",
        "description": "Applies 3 Poison to an enemy.",
        "effects": { "poison": 3 }
      },
      {
        "id": "triage",
        "name": "Triage",
        "starter": true,
        "cost": { "type": "exact", "val": 4 },
        "target": "single_ally",
        "description": "Heal an ally for 6 HP. Clears poison.",
        "effects": { "heal": 6, "cleanse": true }
      },
      {
        "id": "emergency_draught",
        "name": "Emergency Draught",
        "cost": { "type": "threshold", "min": 5 },
        "target": "single_ally",
        "description": "Heal an ally for 9 HP.",
        "effects": { "heal": 9 }
      },
      {
        "id": "plague_flask",
        "name": "Plague Flask",
        "cost": { "type": "threshold", "min": 3 },
        "target": "all_enemies",
        "description": "Apply 2 Poison to all enemies.",
        "effects": { "poisonAll": 2 }
      },
      {
        "id": "sawbones_choice",
        "name": "Sawbones' Choice",
        "cost": { "type": "exact", "val": 1 },
        "target": "single_ally",
        "description": "Sacrifice 4 HP to heal ally for 8 HP.",
        "effects": { "heal": 8, "selfDamage": 4 }
      },
      {
        "id": "field_surgery",
        "name": "Field Surgery",
        "cost": { "type": "combined", "min": 6, "dice": 2 },
        "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 4 HP.",
        "effects": { "healAll": 4 }
      },
      {
        "id": "venom_strike",
        "name": "Venom Strike",
        "cost": { "type": "combined", "min": 5, "dice": 2 },
        "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 4 damage and applies 4 Poison.",
        "effects": { "damage": 4, "poison": 4 }
      }
    ]
  }
};

const RAW_ENEMIES = {
  "cheruscan_raider": {
    "id": "cheruscan_raider",
    "name": "Cheruscan Raider",
    "maxHp": 18,
    "row": "front",
    "damage": [4, 7],
    "speed": 1,
    "xpValue": 5,
    "description": "Germanic warrior. Aggressive melee fighter.",
    "ai": "aggressive",
    "actions": [
      { "name": "Spear Thrust", "damage": 5, "chance": 0.6, "text": "thrusts spear" },
      { "name": "Wild Slash", "damage": 7, "chance": 0.3, "text": "slashes wildly" },
      { "name": "War Cry", "damage": 0, "morale": -5, "chance": 0.1, "text": "lets out a war cry" }
    ]
  },
  "sling_hunter": {
    "id": "sling_hunter",
    "name": "Sling Hunter",
    "maxHp": 12,
    "row": "back",
    "damage": [3, 5],
    "speed": 2,
    "xpValue": 4,
    "description": "Ranged skirmisher. Targets weakest unit.",
    "ai": "sniper",
    "actions": [
      { "name": "Sling Stone", "damage": 4, "chance": 0.7, "text": "hurls a sling stone", "ignoreRow": true },
      { "name": "Aimed Shot", "damage": 6, "chance": 0.2, "text": "takes careful aim", "ignoreRow": true },
      { "name": "Scatter Shot", "damage": 3, "chance": 0.1, "text": "fires scatter shot at the line", "aoe": true }
    ]
  },
  "marsh_wolf": {
    "id": "marsh_wolf",
    "name": "Marsh Wolf",
    "maxHp": 14,
    "row": "front",
    "damage": [3, 6],
    "speed": 3,
    "xpValue": 4,
    "description": "Fast predator. Attacks twice when wounded.",
    "ai": "aggressive",
    "actions": [
      { "name": "Bite", "damage": 4, "chance": 0.5, "text": "lunges with snapping jaws" },
      { "name": "Pounce", "damage": 6, "chance": 0.3, "text": "pounces" },
      { "name": "Howl", "damage": 0, "morale": -8, "chance": 0.2, "text": "howls into the mist" }
    ]
  },
  "fen_viper": {
    "id": "fen_viper",
    "name": "Fen Viper",
    "maxHp": 11,
    "row": "front",
    "damage": [2, 4],
    "speed": 4,
    "xpValue": 4,
    "description": "A venomous marsh snake. Its bite festers.",
    "ai": "aggressive",
    "actions": [
      { "name": "Venomous Bite", "damage": 2, "poisonTarget": 3, "chance": 0.5, "text": "sinks venomous fangs" },
      { "name": "Spit Venom", "damage": 1, "poisonTarget": 2, "chance": 0.3, "text": "spits venom", "ignoreRow": true },
      { "name": "Coil Strike", "damage": 5, "chance": 0.2, "text": "lashes out with a coiled strike" }
    ]
  },
  "bog_seer": {
    "id": "bog_seer",
    "name": "Bog Seer",
    "maxHp": 10,
    "row": "back",
    "damage": [2, 3],
    "speed": 1,
    "xpValue": 5,
    "description": "A hunched figure draped in moss, chanting from the treeline. Attacks the mind.",
    "ai": "sniper",
    "actions": [
      { "name": "Curse of Dread", "damage": 0, "morale": -10, "chance": 0.4, "text": "chants a dreadful curse" },
      { "name": "Marsh Hex", "damage": 3, "morale": -5, "chance": 0.3, "text": "hurls a hex of swamp fire", "ignoreRow": true },
      { "name": "Wail of the Dead", "damage": 0, "morale": -15, "chance": 0.2, "text": "screams with the voices of the dead" },
      { "name": "Bone Shard", "damage": 5, "chance": 0.1, "text": "flings a shard of bone", "ignoreRow": true }
    ]
  },
  "oak_shield": {
    "id": "oak_shield",
    "name": "Oak Shield",
    "maxHp": 35,
    "row": "front",
    "damage": [6, 10],
    "speed": 1,
    "xpValue": 10,
    "isElite": true,
    "description": "A massive warrior carrying a shield hewn from a single oak. Commands respect and fear.",
    "ai": "aggressive",
    "actions": [
      { "name": "Oak Smash", "damage": 8, "chance": 0.4, "text": "smashes with the great oak shield" },
      { "name": "Shieldwall Charge", "damage": 6, "chance": 0.25, "text": "charges behind the oak shield", "aoe": true },
      { "name": "Rallying Roar", "damage": 0, "morale": -8, "chance": 0.15, "text": "roars, rallying nearby warriors" },
      { "name": "Crushing Overhead", "damage": 12, "chance": 0.2, "text": "brings a devastating overhead blow" }
    ]
  },
  "arminius_champion": {
    "id": "arminius_champion",
    "name": "Arminius's Champion",
    "maxHp": 55,
    "row": "front",
    "damage": [8, 14],
    "speed": 2,
    "xpValue": 20,
    "isBoss": true,
    "ai": "boss",
    "actions": [
      { "name": "Crushing Blow", "damage": 10, "chance": 0.4, "text": "brings down a crushing blow" },
      { "name": "Shield Bash", "damage": 6, "chance": 0.25, "text": "bashes with iron shield" },
      { "name": "War Cry", "damage": 0, "morale": -12, "chance": 0.15, "text": "roars a war cry" },
      { "name": "Frenzy", "damage": 8, "chance": 0.2, "text": "attacks in a frenzy", "aoe": true }
    ]
  },
  "cheruscan_shieldbearer": {
    "id": "cheruscan_shieldbearer",
    "name": "Cheruscan Shieldbearer",
    "maxHp": 20,
    "row": "front",
    "damage": [3, 5],
    "speed": 1,
    "xpValue": 6,
    "description": "A broad-shouldered warrior crouching behind an oversized wicker-and-hide shield, covering those behind him.",
    "ai": "aggressive",
    "actions": [
      { "name": "Wall of Shields", "damage": 0, "chance": 0.4, "text": "raises the great shield, protecting nearby warriors", "blockAllEnemies": 3 },
      { "name": "Shield Slam", "damage": 5, "chance": 0.35, "text": "slams forward with the heavy shield" },
      { "name": "Taunt of Thusnelda", "damage": 0, "morale": -8, "chance": 0.25, "text": "screams the name of Arminius\u2019s wife \u2014 your men flinch" }
    ]
  },
  "mire_leech": {
    "id": "mire_leech",
    "name": "Mire Leech",
    "maxHp": 8,
    "row": "front",
    "damage": [2, 4],
    "speed": 2,
    "xpValue": 3,
    "description": "A bloated, arm-length parasite from the black swamp water. The men have heard stories about these crawling into the wounded.",
    "ai": "aggressive",
    "canSpawn": true,
    "deathPoison": 2,
    "actions": [
      { "name": "Latch On", "damage": 2, "poisonTarget": 4, "chance": 0.5, "text": "latches on with burrowing mouthparts" },
      { "name": "Multiply", "damage": 0, "chance": 0.3, "text": "splits and spawns another leech", "spawn": "mire_leech" },
      { "name": "Blood Drain", "damage": 4, "poisonTarget": 2, "chance": 0.2, "text": "drains blood with a sickening pull" }
    ]
  },
  "wicker_man": {
    "id": "wicker_man",
    "name": "Wicker Man",
    "maxHp": 25,
    "row": "back",
    "damage": [2, 2],
    "speed": 0,
    "xpValue": 8,
    "description": "A towering effigy of woven branches, set ablaze by Germanic priests. The smoke chokes the air and shields nearby warriors.",
    "ai": "passive",
    "isStructure": true,
    "aura": { "damageReduction": 2 },
    "turnDamageAll": 2,
    "deathDamageEnemy": 6,
    "actions": [
      { "name": "Burning Effigy", "damage": 0, "chance": 1.0, "text": "burns, choking the air with smoke" }
    ]
  },
  "grove_witch": {
    "id": "grove_witch",
    "name": "Grove Witch",
    "maxHp": 45,
    "row": "back",
    "damage": [5, 10],
    "speed": 1,
    "xpValue": 22,
    "isBoss": true,
    "ai": "boss",
    "actions": [
      { "name": "Thorn Volley", "damage": 5, "chance": 0.3, "text": "sends a volley of blackened thorns", "aoe": true },
      { "name": "Soul Drain", "damage": 7, "morale": -8, "chance": 0.25, "text": "drains the life and will from a soldier", "ignoreRow": true },
      { "name": "Swamp Call", "damage": 0, "morale": -15, "chance": 0.2, "text": "calls upon the swamp spirits" },
      { "name": "Root Grasp", "damage": 9, "chance": 0.25, "text": "commands roots to crush a soldier", "ignoreRow": true }
    ]
  }
};

const RAW_ITEMS = {
  "iron_gladius": {
    "id": "iron_gladius",
    "name": "Iron Gladius",
    "slot": "weapon",
    "rarity": "common",
    "classTags": ["heavy", "command"],
    "stats": { "damage": 2 },
    "description": "A sturdy blade taken from a fallen raider."
  },
  "raider_shield": {
    "id": "raider_shield",
    "name": "Raider's Shield",
    "slot": "armor",
    "rarity": "common",
    "classTags": ["roman"],
    "stats": { "block": 2 },
    "description": "Rough wood and hide, but it turns a blade."
  },
  "wolf_pelt": {
    "id": "wolf_pelt",
    "name": "Wolf Pelt",
    "slot": "armor",
    "rarity": "common",
    "classTags": ["roman"],
    "stats": { "maxHp": 4 },
    "description": "Thick fur that wards off the cold and softens blows."
  },
  "sling_stones": {
    "id": "sling_stones",
    "name": "Sling Stones",
    "slot": "weapon",
    "rarity": "common",
    "classTags": ["command", "support"],
    "stats": { "damage": 1 },
    "description": "Smooth river stones, still in their pouch."
  },
  "bone_needle_kit": {
    "id": "bone_needle_kit",
    "name": "Bone Needle Kit",
    "slot": "trinket",
    "rarity": "common",
    "classTags": ["support"],
    "stats": { "heal": 1 },
    "description": "Germanic surgical tools. Crude but effective."
  },
  "herb_pouch": {
    "id": "herb_pouch",
    "name": "Herb Pouch",
    "slot": "trinket",
    "rarity": "common",
    "classTags": ["command", "support"],
    "stats": { "heal": 1 },
    "description": "Dried marsh herbs with surprising potency."
  },
  "woad_charm": {
    "id": "woad_charm",
    "name": "Woad Charm",
    "slot": "trinket",
    "rarity": "uncommon",
    "classTags": ["roman"],
    "stats": { "maxHp": 3, "block": 1 },
    "description": "A blue-stained bone token. It feels warm to the touch."
  },
  "hunters_cloak": {
    "id": "hunters_cloak",
    "name": "Hunter's Cloak",
    "slot": "armor",
    "rarity": "uncommon",
    "classTags": ["command", "support"],
    "stats": { "maxHp": 5 },
    "description": "Woven from marsh reeds and wolf hair. Surprisingly tough."
  },
  "fang_necklace": {
    "id": "fang_necklace",
    "name": "Fang Necklace",
    "slot": "trinket",
    "rarity": "uncommon",
    "classTags": ["roman"],
    "stats": { "damage": 1, "maxHp": 2 },
    "description": "A string of wolf fangs. The men eye it uneasily."
  },
  "chiefs_spear": {
    "id": "chiefs_spear",
    "name": "Chieftain's Spear",
    "slot": "weapon",
    "rarity": "rare",
    "classTags": ["heavy"],
    "stats": { "damage": 4 },
    "description": "Ash-hafted and iron-tipped. Taken from a war chief."
  },
  "marsh_fang": {
    "id": "marsh_fang",
    "name": "Marsh Fang",
    "slot": "trinket",
    "rarity": "rare",
    "classTags": ["support"],
    "stats": { "heal": 2, "maxHp": 3 },
    "description": "A hollowed fang filled with dark salve. Potent medicine."
  },
  "runic_stone": {
    "id": "runic_stone",
    "name": "Runic Stone",
    "slot": "trinket",
    "rarity": "rare",
    "classTags": ["roman"],
    "stats": { "extraDice": 1 },
    "description": "A stone carved with strange runes. It hums faintly. (+1 die per turn)"
  },
  "scouts_sling": {
    "id": "scouts_sling",
    "name": "Scout's Sling",
    "slot": "weapon",
    "rarity": "uncommon",
    "classTags": ["support"],
    "stats": { "damage": 2 },
    "description": "A well-worn sling. Even the surgeon can fight."
  },
  "champions_helm": {
    "id": "champions_helm",
    "name": "Champion's Helm",
    "slot": "armor",
    "rarity": "rare",
    "classTags": ["heavy", "command"],
    "stats": { "maxHp": 6, "block": 2 },
    "description": "A heavy iron helm ripped from the champion. It reeks of blood."
  },
  "arm_ring_of_arminius": {
    "id": "arm_ring_of_arminius",
    "name": "Arm Ring of Arminius",
    "slot": "trinket",
    "rarity": "rare",
    "classTags": ["roman"],
    "stats": { "damage": 2, "maxHp": 3 },
    "description": "A gold arm ring inscribed with Germanic runes. Power radiates from it."
  },
  "warlords_blade": {
    "id": "warlords_blade",
    "name": "Warlord's Blade",
    "slot": "weapon",
    "rarity": "rare",
    "classTags": ["heavy"],
    "stats": { "damage": 5 },
    "description": "A massive iron sword. Only the strongest can wield it."
  }
};

const RAW_EVENTS = [
  {
    "id": "roadside_shrine",
    "name": "Roadside Shrine",
    "intro": "You come upon a weathered shrine to some forgotten god. Offerings of fruit and bone litter the base. The men look to you for guidance.",
    "choices": [
      {
        "text": "Leave an offering and pray.",
        "outcomes": [
          { "weight": 0.5, "text": "A warm light fills the glade. The men feel renewed.", "effects": { "healAll": 8, "morale": 10 } },
          { "weight": 0.3, "text": "Nothing happens. The gods are silent.", "effects": {} },
          { "weight": 0.2, "text": "A cold wind sweeps through. The shrine crumbles. An ill omen.", "effects": { "morale": -10 } }
        ]
      },
      {
        "text": "Smash the shrine and take the offerings.",
        "outcomes": [
          { "weight": 0.4, "text": "You find a charm hidden among the bones.", "effects": { "grantItem": "woad_charm" } },
          { "weight": 0.3, "text": "The men cheer at the defiance, but the forest seems to darken.", "effects": { "morale": 5 } },
          { "weight": 0.3, "text": "A trap! Poisoned thorns cut your hands.", "effects": { "damageAll": 5, "morale": -5 } }
        ]
      },
      {
        "text": "Pass by without stopping.",
        "outcomes": [
          { "weight": 1.0, "text": "You march on. The shrine watches in silence.", "effects": {} }
        ]
      }
    ]
  },
  {
    "id": "fallen_legionary",
    "name": "Fallen Legionary",
    "intro": "A Roman soldier lies against a tree, barely alive. His armor is shattered and his eyes are dim. He clutches a leather satchel.",
    "choices": [
      {
        "text": "Tend to his wounds and take the satchel.",
        "outcomes": [
          { "weight": 0.6, "text": "He dies in your arms, but the satchel holds useful supplies.", "effects": { "grantItem": "herb_pouch", "morale": -5 } },
          { "weight": 0.4, "text": "He revives briefly and whispers a warning about the path ahead. The satchel holds medicine.", "effects": { "healAll": 6, "morale": 5 } }
        ]
      },
      {
        "text": "Take his equipment and move on.",
        "outcomes": [
          { "weight": 0.5, "text": "His gladius is still sharp.", "effects": { "grantItem": "iron_gladius" } },
          { "weight": 0.5, "text": "Nothing of value remains. The men grow quiet.", "effects": { "morale": -8 } }
        ]
      }
    ]
  },
  {
    "id": "river_crossing",
    "name": "River Crossing",
    "intro": "A swollen river blocks your path. The current is fast and the water dark. Upstream, a narrow fallen log offers a precarious bridge.",
    "choices": [
      {
        "text": "Ford the river directly.",
        "outcomes": [
          { "weight": 0.4, "text": "You push through the freezing water. Everyone makes it, barely.", "effects": { "damageAll": 4, "morale": -5 } },
          { "weight": 0.3, "text": "The crossing goes smoothly. The cold water numbs old wounds.", "effects": { "healAll": 3 } },
          { "weight": 0.3, "text": "The current is stronger than expected. Equipment is lost.", "effects": { "damageAll": 6, "morale": -10 } }
        ]
      },
      {
        "text": "Cross on the fallen log.",
        "outcomes": [
          { "weight": 0.5, "text": "Careful footing gets everyone across safely.", "effects": { "morale": 5 } },
          { "weight": 0.3, "text": "The log holds. You find a cache on the far bank.", "effects": { "grantItem": "fang_necklace" } },
          { "weight": 0.2, "text": "The log snaps! Several soldiers tumble into the rapids.", "effects": { "damageAll": 8, "morale": -8 } }
        ]
      }
    ]
  },
  {
    "id": "captured_scout",
    "name": "Captured Scout",
    "intro": "Your men drag a struggling Germanic scout from the bushes. He spits and snarls but is clearly terrified.",
    "choices": [
      {
        "text": "Interrogate him for information.",
        "outcomes": [
          { "weight": 0.5, "text": "He reveals a hidden supply cache before escaping.", "effects": { "grantItem": "herb_pouch", "morale": 5 } },
          { "weight": 0.3, "text": "He tells you nothing useful and manages to bite a soldier.", "effects": { "damageAll": 2 } },
          { "weight": 0.2, "text": "He breaks free and screams an alarm. You must move quickly.", "effects": { "morale": -12 } }
        ]
      },
      {
        "text": "Release him as a show of mercy.",
        "outcomes": [
          { "weight": 0.6, "text": "The men question your judgment, but the gesture feels right.", "effects": { "morale": 8 } },
          { "weight": 0.4, "text": "He returns later with friends. You were foolish.", "effects": { "morale": -15 } }
        ]
      }
    ]
  },
  {
    "id": "foragers_cache",
    "name": "Forager's Cache",
    "intro": "Behind a fallen oak, you discover a hidden cache of supplies \u2014 likely left by a Germanic foraging party. Dried meat, herbs, and a few weapons.",
    "choices": [
      {
        "text": "Take everything.",
        "outcomes": [
          { "weight": 0.6, "text": "A good haul. The men eat well tonight.", "effects": { "healAll": 10, "morale": 8 } },
          { "weight": 0.4, "text": "You find excellent supplies and a fine weapon among the cache.", "effects": { "healAll": 6, "grantItem": "iron_gladius" } }
        ]
      },
      {
        "text": "Take only the medicine and leave the rest.",
        "outcomes": [
          { "weight": 0.7, "text": "The herbs are potent. Your wounded recover.", "effects": { "healAll": 12 } },
          { "weight": 0.3, "text": "Among the herbs you find something special.", "effects": { "healAll": 8, "grantItem": "bone_needle_kit" } }
        ]
      },
      {
        "text": "Leave it \u2014 it could be a trap.",
        "outcomes": [
          { "weight": 0.5, "text": "Prudent. The men grumble but respect your caution.", "effects": { "morale": -3 } },
          { "weight": 0.5, "text": "As you leave, you hear a tripwire snap behind you. Good instincts.", "effects": { "morale": 10 } }
        ]
      }
    ]
  },
  {
    "id": "deserter_camp",
    "name": "Deserter Camp",
    "intro": "You stumble upon a makeshift camp. Roman equipment is scattered about, but the soldiers here have abandoned their colors. They eye you warily, hands on weapons.",
    "choices": [
      {
        "text": "Demand they rejoin the column.",
        "outcomes": [
          { "weight": 0.4, "text": "They fall in line, ashamed. Your men stand a little taller.", "effects": { "morale": 15 } },
          { "weight": 0.3, "text": "They refuse and flee into the forest, but leave useful supplies behind.", "effects": { "healAll": 6, "grantItem": "iron_gladius" } },
          { "weight": 0.3, "text": "They attack in desperation. You put them down, but the fight costs you.", "effects": { "damageAll": 5, "morale": -10 } }
        ]
      },
      {
        "text": "Trade supplies with them.",
        "outcomes": [
          { "weight": 0.6, "text": "They share medicine and a warm meal. A brief taste of civilization.", "effects": { "healAll": 10, "morale": 5 } },
          { "weight": 0.4, "text": "They trade you a curious trinket for your last rations.", "effects": { "grantItem": "woad_charm", "damageAll": 3 } }
        ]
      },
      {
        "text": "Leave them. You have enough problems.",
        "outcomes": [
          { "weight": 1.0, "text": "You slip past. The deserters watch you go in silence.", "effects": {} }
        ]
      }
    ]
  },
  {
    "id": "ancient_oak",
    "name": "The Ancient Oak",
    "intro": "A colossal oak tree dominates a clearing, its trunk carved with faces that seem to shift in the firelight. Offerings hang from its branches \u2014 weapons, bones, and Roman standards.",
    "choices": [
      {
        "text": "Take back the Roman standards.",
        "outcomes": [
          { "weight": 0.5, "text": "Your men cheer. The standards still carry weight, even here.", "effects": { "morale": 20 } },
          { "weight": 0.3, "text": "As you pull the last standard free, the tree groans. Something watches.", "effects": { "morale": 10, "damageAll": 3 } },
          { "weight": 0.2, "text": "The offerings were trapped. Poison thorns slice your hands.", "effects": { "damageAll": 6, "morale": -5 } }
        ]
      },
      {
        "text": "Search the offerings for useful equipment.",
        "outcomes": [
          { "weight": 0.5, "text": "Among the bones you find a weapon, still sharp.", "effects": { "grantItem": "chiefs_spear" } },
          { "weight": 0.3, "text": "You find herbs wrapped in leather. Good medicine.", "effects": { "healAll": 8, "grantItem": "herb_pouch" } },
          { "weight": 0.2, "text": "Nothing but rot and bone. The men grow uneasy.", "effects": { "morale": -8 } }
        ]
      },
      {
        "text": "Burn the tree.",
        "outcomes": [
          { "weight": 0.4, "text": "The fire catches fast. The carved faces scream as they burn. Your men feel a dark satisfaction.", "effects": { "morale": 5 } },
          { "weight": 0.3, "text": "The fire reveals a hidden cache at the roots.", "effects": { "grantItem": "runic_stone", "morale": 5 } },
          { "weight": 0.3, "text": "The smoke draws attention. You hear war horns in the distance.", "effects": { "morale": -12 } }
        ]
      }
    ]
  }
];

const RAW_ENCOUNTERS = {
  "templates": [
    {
      "name": "Ambush on the Trail",
      "enemies": ["cheruscan_raider", "cheruscan_raider", "sling_hunter"],
      "intro": "Shapes burst from the undergrowth \u2014 Germanic warriors block the path."
    },
    {
      "name": "Wolves in the Mire",
      "enemies": ["marsh_wolf", "marsh_wolf"],
      "intro": "Low growls echo from the fog. Yellow eyes track your every step."
    },
    {
      "name": "Raiding Party",
      "enemies": ["cheruscan_raider", "sling_hunter", "sling_hunter"],
      "intro": "Stones whistle past. A raiding party has found your trail."
    },
    {
      "name": "The Clearing",
      "enemies": ["cheruscan_raider", "cheruscan_raider", "marsh_wolf", "sling_hunter"],
      "intro": "You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you."
    }
  ],
  "bossEncounters": [
    {
      "name": "Arminius's Champion",
      "enemies": ["arminius_champion", "cheruscan_raider"],
      "intro": "A towering Germanic champion steps from the treeline, flanked by his guard. The final test."
    },
    {
      "name": "The Grove Witch",
      "enemies": ["grove_witch", "bog_seer", "marsh_wolf"],
      "intro": "The trees twist apart to reveal a figure wreathed in green flame. The forest itself fights against you."
    }
  ],
  "threatLevels": {
    "easy": [
      {
        "name": "Forest Scouts",
        "enemies": ["cheruscan_raider", "sling_hunter"],
        "intro": "A pair of scouts spot your column and attack."
      },
      {
        "name": "Lone Wolves",
        "enemies": ["marsh_wolf", "marsh_wolf"],
        "intro": "Wolves slink from the undergrowth, hungry and desperate."
      },
      {
        "name": "Eerie Chanting",
        "enemies": ["bog_seer", "cheruscan_raider"],
        "intro": "Chanting drifts from the fog. A seer and his guard block your path."
      },
      {
        "name": "Viper Nest",
        "enemies": ["fen_viper", "fen_viper"],
        "intro": "You step into a nest of marsh vipers. They strike without warning."
      },
      {
        "name": "Swamp Crawlers",
        "enemies": ["mire_leech", "mire_leech"],
        "intro": "Bloated shapes slither from the mud. The swamp breeds foul things."
      }
    ],
    "mid": [
      {
        "name": "Ambush on the Trail",
        "enemies": ["cheruscan_raider", "cheruscan_raider", "sling_hunter"],
        "intro": "Shapes burst from the undergrowth \u2014 Germanic warriors block the path."
      },
      {
        "name": "Raiding Party",
        "enemies": ["cheruscan_raider", "sling_hunter", "sling_hunter"],
        "intro": "Stones whistle past. A raiding party has found your trail."
      },
      {
        "name": "Wolf Pack",
        "enemies": ["marsh_wolf", "marsh_wolf", "marsh_wolf"],
        "intro": "A whole wolf pack emerges from the fog. There is no retreat."
      },
      {
        "name": "Cursed Hollow",
        "enemies": ["bog_seer", "bog_seer", "cheruscan_raider"],
        "intro": "Two seers stand in a hollow, their chanting shaking the air. A warrior guards them."
      },
      {
        "name": "Wolves and Whispers",
        "enemies": ["marsh_wolf", "marsh_wolf", "bog_seer"],
        "intro": "Wolves circle in the mist while eerie chanting echoes from behind the trees."
      },
      {
        "name": "Venomous Ambush",
        "enemies": ["fen_viper", "fen_viper", "sling_hunter"],
        "intro": "Vipers and slingers attack from the swamp in a coordinated ambush."
      },
      {
        "name": "Shield Line",
        "enemies": ["cheruscan_shieldbearer", "cheruscan_raider", "sling_hunter"],
        "intro": "A shieldbearer hunkers down while warriors form behind him. A disciplined formation."
      },
      {
        "name": "Leech Swarm",
        "enemies": ["mire_leech", "mire_leech", "mire_leech"],
        "intro": "The ground writhes. Bloated leeches pour from the mud in a sickening wave."
      }
    ],
    "hard": [
      {
        "name": "The Clearing",
        "enemies": ["cheruscan_raider", "cheruscan_raider", "marsh_wolf", "sling_hunter"],
        "intro": "You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you."
      },
      {
        "name": "War Band",
        "enemies": ["cheruscan_raider", "cheruscan_raider", "cheruscan_raider", "sling_hunter"],
        "intro": "A full war band charges from the trees. Prepare for a desperate fight."
      },
      {
        "name": "The Oak Shield",
        "enemies": ["oak_shield", "cheruscan_raider", "sling_hunter"],
        "intro": "A massive warrior blocks the trail, oak shield raised. His warband flanks you."
      },
      {
        "name": "Ritual Guard",
        "enemies": ["oak_shield", "bog_seer", "bog_seer"],
        "intro": "An elite warrior guards two seers performing a dark ritual. Stop them or be consumed."
      },
      {
        "name": "The Hunting Party",
        "enemies": ["oak_shield", "marsh_wolf", "marsh_wolf"],
        "intro": "An elite warrior commands a pair of trained war wolves. They advance as one."
      },
      {
        "name": "Poison Grove",
        "enemies": ["fen_viper", "fen_viper", "bog_seer", "cheruscan_raider"],
        "intro": "Vipers slither among the roots as a seer chants protection. A warrior guards the approach."
      },
      {
        "name": "The Burning Effigy",
        "enemies": ["wicker_man", "cheruscan_shieldbearer", "bog_seer"],
        "intro": "A towering wicker effigy burns in the clearing. Its smoke protects the warriors gathered around it."
      },
      {
        "name": "Shield Wall",
        "enemies": ["cheruscan_shieldbearer", "cheruscan_shieldbearer", "sling_hunter", "sling_hunter"],
        "intro": "Two shieldbearers form an impenetrable wall while slingers rain stones from behind."
      },
      {
        "name": "Swamp Horror",
        "enemies": ["mire_leech", "mire_leech", "fen_viper", "bog_seer"],
        "intro": "The swamp itself attacks \u2014 leeches, vipers, and a chanting seer drive the assault."
      }
    ]
  },
  "dropTables": {
    "cheruscan_raider": {
      "nothingChance": 0.25,
      "tiers": [
        { "chance": 0.45, "items": ["iron_gladius", "raider_shield", "herb_pouch"] },
        { "chance": 0.20, "items": ["woad_charm", "fang_necklace"] },
        { "chance": 0.05, "items": ["chiefs_spear", "runic_stone"] }
      ]
    },
    "sling_hunter": {
      "nothingChance": 0.30,
      "tiers": [
        { "chance": 0.40, "items": ["sling_stones", "bone_needle_kit", "raider_shield"] },
        { "chance": 0.20, "items": ["hunters_cloak", "scouts_sling"] },
        { "chance": 0.05, "items": ["woad_charm", "runic_stone"] }
      ]
    },
    "marsh_wolf": {
      "nothingChance": 0.25,
      "tiers": [
        { "chance": 0.40, "items": ["wolf_pelt", "herb_pouch"] },
        { "chance": 0.25, "items": ["fang_necklace"] },
        { "chance": 0.10, "items": ["marsh_fang", "runic_stone"] }
      ]
    },
    "arminius_champion": {
      "nothingChance": 0.0,
      "tiers": [
        { "chance": 1.0, "items": "__BOSS_DROP_POOL__" }
      ]
    },
    "fen_viper": {
      "nothingChance": 0.40,
      "tiers": [
        { "chance": 0.40, "items": ["herb_pouch", "bone_needle_kit"] },
        { "chance": 0.15, "items": ["fang_necklace"] },
        { "chance": 0.05, "items": ["marsh_fang"] }
      ]
    },
    "bog_seer": {
      "nothingChance": 0.30,
      "tiers": [
        { "chance": 0.40, "items": ["herb_pouch", "bone_needle_kit"] },
        { "chance": 0.20, "items": ["woad_charm", "fang_necklace"] },
        { "chance": 0.10, "items": ["runic_stone"] }
      ]
    },
    "oak_shield": {
      "nothingChance": 0.10,
      "tiers": [
        { "chance": 0.40, "items": ["iron_gladius", "raider_shield", "wolf_pelt"] },
        { "chance": 0.35, "items": ["woad_charm", "fang_necklace", "hunters_cloak"] },
        { "chance": 0.15, "items": ["chiefs_spear", "runic_stone"] }
      ]
    },
    "grove_witch": {
      "nothingChance": 0.0,
      "tiers": [
        { "chance": 1.0, "items": "__BOSS_DROP_POOL__" }
      ]
    },
    "cheruscan_shieldbearer": {
      "nothingChance": 0.20,
      "tiers": [
        { "chance": 0.45, "items": ["raider_shield", "iron_gladius", "wolf_pelt"] },
        { "chance": 0.25, "items": ["woad_charm", "hunters_cloak"] },
        { "chance": 0.10, "items": ["chiefs_spear"] }
      ]
    },
    "mire_leech": {
      "nothingChance": 0.50,
      "tiers": [
        { "chance": 0.35, "items": ["herb_pouch", "bone_needle_kit"] },
        { "chance": 0.15, "items": ["fang_necklace", "marsh_fang"] }
      ]
    },
    "wicker_man": {
      "nothingChance": 0.10,
      "tiers": [
        { "chance": 0.40, "items": ["woad_charm", "herb_pouch"] },
        { "chance": 0.35, "items": ["runic_stone", "fang_necklace"] },
        { "chance": 0.15, "items": ["chiefs_spear", "arm_ring_of_arminius"] }
      ]
    }
  }
};

const RAW_CONFIG = {
  "moraleBands": [
    { "min": 75, "label": "INSPIRED", "color": "#c9a227" },
    { "min": 25, "label": "STEADY", "color": "#6b8f4a" },
    { "min": -24, "label": "SHAKEN", "color": "#8a8a7a" },
    { "min": -74, "label": "DISTRESSED", "color": "#a0522d" },
    { "min": -100, "label": "BROKEN", "color": "#6b1a1a" }
  ],
  "equipSlots": {
    "weapon": 2,
    "armor": 2,
    "trinket": 3
  },
  "bossDropPool": ["champions_helm", "arm_ring_of_arminius", "warlords_blade"],
  "baseDiceCount": 4
};
