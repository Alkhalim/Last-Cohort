// ============================================================
// Last Cohort – Class Data
// Edit this file to add/modify classes and their skills.
// ============================================================

const RAW_CLASSES = {
  "legionary": {
    "name": "Legionary",
    "title": "LEG",
    "maxHp": 32,
    "tags": ["melee", "roman"],
    "equipSlots": { "weapon": 2, "armor": 3, "trinket": 2 },
    "description": "Heavy infantry. Reliable damage and strong defense.",
    "passive": {
      "name": "Disciplined Formation",
      "description": "Whenever a natural pair is rolled, gain +2 Block."
    },
    "skills": [
      {
        "id": "strike", "name": "Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic sword strike. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "shield_brace", "name": "Shield Brace", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "self",
        "description": "Gain 5 Block.",
        "effects": { "block": 5 }
      },
      {
        "id": "gladius_thrust", "name": "Gladius Thrust", "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "Precise thrust. Deals 7 damage.",
        "effects": { "damage": 7 }
      },
      {
        "id": "hold_fast", "name": "Hold Fast", "cooldown": 2,
        "cost": { "type": "exact", "val": 4 }, "target": "self",
        "description": "Gain 8 Block and Taunt (enemies target this unit).",
        "effects": { "block": 8, "taunt": true }
      },
      {
        "id": "pilum_cast", "name": "Pilum Cast", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Throw pilum at any row. Deals 6 damage.",
        "effects": { "damage": 6, "ignoreRow": true }
      },
      {
        "id": "twin_slash", "name": "Twin Slash", "cooldown": 2,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 10 damage.",
        "effects": { "damage": 10 }
      },
      {
        "id": "shield_wall", "name": "Shield Wall", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 8+. All allies gain 5 Block.",
        "effects": { "blockAll": 5 }
      }
    ]
  },
  "centurion": {
    "name": "Centurion",
    "title": "CEN",
    "maxHp": 28,
    "tags": ["command", "roman"],
    "equipSlots": { "weapon": 2, "armor": 2, "trinket": 3 },
    "description": "Officer. Buffs allies and controls the battlefield.",
    "passive": {
      "name": "Discipline of Office",
      "description": "Once per turn, adjust one die by +1 or -1.",
      "usedThisTurn": false
    },
    "skills": [
      {
        "id": "strike", "name": "Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic strike. Deals 4 damage.",
        "effects": { "damage": 4 }
      },
      {
        "id": "commanding_shout", "name": "Commanding Shout", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "All allies gain +2 damage on their next attack.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 1 } }
      },
      {
        "id": "reform_the_line", "name": "Reform the Line", "starter": true,
        "cost": { "type": "threshold", "min": 4 }, "target": "all_allies",
        "description": "All allies gain 4 Block.",
        "effects": { "blockAll": 4 }
      },
      {
        "id": "officers_care", "name": "Officer's Care",
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "All allies heal 2 HP and gain +1 damage for next 3 attacks.",
        "effects": { "healAll": 2, "buffAllies": { "bonusDamage": 1, "attacks": 3 } }
      },
      {
        "id": "measured_advance", "name": "Measured Advance", "cooldown": 2,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 7+. Deals 8 damage and all allies gain 3 Block.",
        "effects": { "damage": 8, "blockAll": 3 }
      },
      {
        "id": "no_retreat", "name": "No Retreat", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "All allies gain 5 Block and +8 Morale.",
        "effects": { "blockAll": 5, "morale": 8 }
      },
      {
        "id": "rally_cry", "name": "Rally Cry", "cooldown": 3,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. +10 Morale and +1 damage for next 2 attacks.",
        "effects": { "morale": 10, "buffAllies": { "bonusDamage": 1, "attacks": 2 } }
      },
      {
        "id": "decimation_strike", "name": "Decimation Strike", "cooldown": 3,
        "cost": { "type": "combinedExact", "val": 7, "dice": 2 }, "target": "single_enemy",
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
    "equipSlots": { "weapon": 1, "armor": 1, "trinket": 5 },
    "description": "Field surgeon. Heals, poisons, and manages attrition.",
    "passive": {
      "name": "Healer's Instinct",
      "description": "Whenever a 1 is rolled, heal a random damaged ally for 1 HP."
    },
    "skills": [
      {
        "id": "bind_wounds", "name": "Bind Wounds", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_ally",
        "description": "Heal an ally for 3 HP.",
        "effects": { "heal": 3 }
      },
      {
        "id": "aconitum", "name": "Aconitum", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Applies 3 Poison to any enemy.",
        "effects": { "poison": 3 }
      },
      {
        "id": "triage", "name": "Triage", "starter": true,
        "cost": { "type": "exact", "val": 4 }, "target": "single_ally",
        "description": "Heal an ally for 6 HP. Clears poison.",
        "effects": { "heal": 6, "cleanse": true }
      },
      {
        "id": "emergency_draught", "name": "Emergency Draught", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_ally",
        "description": "Heal an ally for 7 HP.",
        "effects": { "heal": 7 }
      },
      {
        "id": "plague_flask", "name": "Plague Flask", "cooldown": 1,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Hurl a flask of plague. 4 Poison to target, 2 Poison to all others. (1 turn cooldown)",
        "effects": { "poison": 4, "poisonSplash": 2 }
      },
      {
        "id": "sawbones_choice", "name": "Sawbones' Choice", "cooldown": 2,
        "cost": { "type": "exact", "val": 1 }, "target": "single_ally",
        "description": "Sacrifice 4 HP to heal ally for 10 HP and grant 3 Block.",
        "effects": { "heal": 10, "selfDamage": 4, "block": 3 }
      },
      {
        "id": "field_surgery", "name": "Field Surgery", "cooldown": 3,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 4 HP.",
        "effects": { "healAll": 4 }
      },
      {
        "id": "venom_strike", "name": "Venom Strike", "cooldown": 2,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 4 damage and applies 4 Poison.",
        "effects": { "damage": 4, "poison": 4 }
      }
    ]
  },
  "sagittarius": {
    "name": "Sagittarius",
    "title": "SAG",
    "maxHp": 20,
    "tags": ["ranged", "roman"],
    "equipSlots": { "weapon": 3, "armor": 1, "trinket": 3 },
    "description": "Roman archer. Fragile but strikes any row with precision.",
    "passive": {
      "name": "Eagle Eye",
      "description": "Whenever a 6 is rolled, deal 1 damage to a random enemy."
    },
    "skills": [
      {
        "id": "loose_arrow", "name": "Loose Arrow", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Loose an arrow at any target. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "aimed_shot", "name": "Aimed Shot", "cooldown": 2, "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Carefully aimed shot. Deals 6 damage. Ignores block.",
        "effects": { "damage": 6, "pierceBlock": 99 }
      },
      {
        "id": "suppressing_fire", "name": "Suppressing Fire", "starter": true, "cooldown": 2,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "Rain arrows on a row. Deals 2 damage to target and all enemies in the same row. (2 turn cooldown)",
        "effects": { "damage": 2, "splashRow": true }
      },
      {
        "id": "piercing_shot", "name": "Piercing Shot", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A powerful shot that pierces all armor. Deals 8 damage, ignores all block.",
        "effects": { "damage": 8, "pierceBlock": 99 }
      },
      {
        "id": "arrow_volley", "name": "Arrow Volley", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_enemies",
        "description": "2 dice totaling 6+. Deals 3 damage to all enemies.",
        "effects": { "damageAll": 3 }
      },
      {
        "id": "mark_target", "name": "Mark Target",
        "cost": { "type": "exact", "val": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Mark and poison a target. Applies 3 Poison to any enemy.",
        "effects": { "poison": 3 }
      },
      {
        "id": "flaming_arrow", "name": "Flaming Arrow", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deals 7 damage and applies 3 Poison.",
        "effects": { "damage": 7, "poison": 3 }
      }
    ]
  },
  "signifer": {
    "name": "Signifer",
    "title": "SIG",
    "maxHp": 25,
    "tags": ["command", "roman"],
    "equipSlots": { "weapon": 1, "armor": 3, "trinket": 3 },
    "description": "Standard Bearer. Rallies the cohort with morale and buffs.",
    "passive": {
      "name": "Standard of the Legion",
      "description": "+1 extra die per turn. The standard inspires focus.",
      "extraDice": true
    },
    "skills": [
      {
        "id": "standard_strike", "name": "Standard Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Strike with the standard. Deals 2 damage.",
        "effects": { "damage": 2 }
      },
      {
        "id": "raise_the_eagle", "name": "Raise the Eagle", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "Raise the eagle standard. +8 Morale.",
        "effects": { "morale": 8 }
      },
      {
        "id": "inspire", "name": "Inspire", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "Inspire the troops. All allies gain +1 damage for next 2 attacks.",
        "effects": { "buffAllies": { "bonusDamage": 1, "attacks": 2 } }
      },
      {
        "id": "hold_the_line", "name": "Hold the Line", "cooldown": 2,
        "cost": { "type": "threshold", "min": 4 }, "target": "all_allies",
        "description": "All allies gain 3 Block. +5 Morale.",
        "effects": { "blockAll": 3, "morale": 5 }
      },
      {
        "id": "battle_hymn", "name": "Battle Hymn", "cooldown": 3,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 7+. +15 Morale, all allies gain +1 damage for next attack.",
        "effects": { "morale": 15, "buffAllies": { "bonusDamage": 1, "attacks": 1 } }
      },
      {
        "id": "defiant_stand", "name": "Defiant Stand", "cooldown": 3,
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "All allies gain 6 Block and +8 Morale.",
        "effects": { "blockAll": 6, "morale": 8 }
      },
      {
        "id": "standard_charge", "name": "Standard Charge", "cooldown": 2,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 8 damage and +8 Morale.",
        "effects": { "damage": 8, "morale": 8 }
      }
    ]
  },
  "cornicen": {
    "name": "Cornicen",
    "title": "COR",
    "maxHp": 23,
    "tags": ["support", "roman"],
    "equipSlots": { "weapon": 1, "armor": 2, "trinket": 4 },
    "description": "Trumpeter. Debuffs enemies and supports allies with sound.",
    "passive": {
      "name": "Discordant Tune",
      "description": "Reroll 1 die per turn. Rerolls never repeat the same value.",
      "reroll": true
    },
    "skills": [
      {
        "id": "horn_blast", "name": "Horn Blast", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Blast a disorienting note. Deals 2 damage, half reverberates to back row.",
        "effects": { "damage": 2, "splashBackRow": true }
      },
      {
        "id": "battle_horn", "name": "Battle Horn", "starter": true, "cooldown": 1,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "Sound the battle horn. Heal all allies for 1 HP and grant 1 Block. (1 turn cooldown)",
        "effects": { "healAll": 1, "blockAll": 1 }
      },
      {
        "id": "war_drums", "name": "War Drums", "cooldown": 2, "starter": true,
        "cost": { "type": "exact", "val": 5 }, "target": "all_allies",
        "description": "Beat the war drums. All allies gain +1 damage for next attack. +6 Morale.",
        "effects": { "buffAllies": { "bonusDamage": 1, "attacks": 1 }, "morale": 6 }
      },
      {
        "id": "dissonant_note", "name": "Dissonant Note",
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "A piercing note. Deals 3 damage and applies 3 Poison.",
        "effects": { "damage": 3, "poison": 3 }
      },
      {
        "id": "rallying_trumpet", "name": "Rallying Trumpet", "cooldown": 3,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 6 HP. +10 Morale.",
        "effects": { "healAll": 6, "morale": 10 }
      },
      {
        "id": "cacophony", "name": "Cacophony", "cooldown": 2,
        "cost": { "type": "exact", "val": 1 }, "target": "all_enemies",
        "description": "A cacophony of noise. Deals 1 damage and applies 1 Poison to all enemies.",
        "effects": { "damageAll": 1, "poisonAll": 1 }
      },
      {
        "id": "thunderous_blast", "name": "Thunderous Blast", "cooldown": 3,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 7+. Deals 5 damage to target, half to all others. +6 Morale.",
        "effects": { "damage": 5, "splashHalf": true, "morale": 6 }
      }
    ]
  },
  "equites": {
    "name": "Equites",
    "title": "EQU",
    "maxHp": 26,
    "tags": ["melee", "roman"],
    "equipSlots": { "weapon": 3, "armor": 2, "trinket": 2 },
    "description": "Roman cavalry. Devastating charge openers that can strike any target.",
    "passive": {
      "name": "Cavalry Charge",
      "description": "First attack each encounter deals +50% damage."
    },
    "skills": [
      {
        "id": "lance_thrust", "name": "Lance Thrust", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Thrust with the lance at any target. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "charging_strike", "name": "Charging Strike", "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A powerful charging blow. Deals 7 damage.",
        "effects": { "damage": 7 }
      },
      {
        "id": "trample", "name": "Trample", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "Trample a front-line enemy. Deals 4 damage and 2 damage to enemies directly beside it.",
        "effects": { "damage": 4, "splashAdjacent": 2 }
      },
      {
        "id": "hit_and_run", "name": "Hit and Run", "cooldown": 2,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Strike and wheel away. Deals 3 damage and gain 3 Block.",
        "effects": { "damage": 3, "block": 3 }
      },
      {
        "id": "devastating_charge", "name": "Devastating Charge", "cooldown": 2,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 7+. A thunderous charge. Deals 10 damage.",
        "effects": { "damage": 10 }
      },
      {
        "id": "shield_breaker", "name": "Shield Breaker", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Smash through defenses. Deals 6 damage, ignores block.",
        "effects": { "damage": 6, "pierceBlock": 99 }
      },
      {
        "id": "rally_charge", "name": "Rally Charge", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deals 8 damage. +10 Morale.",
        "effects": { "damage": 8, "morale": 10 }
      }
    ]
  },
  "ballistarius": {
    "name": "Ballistarius",
    "title": "BAL",
    "maxHp": 20,
    "tags": ["ranged", "roman"],
    "equipSlots": { "weapon": 2, "armor": 1, "trinket": 4 },
    "description": "Roman siege crossbowman. Every hit weakens the enemy, reducing their damage.",
    "passive": {
      "name": "Pinning Fire",
      "description": "Enemies damaged by this unit deal 15% less damage on their next action."
    },
    "skills": [
      {
        "id": "crossbow_bolt", "name": "Crossbow Bolt", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Fire a bolt at any target. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "pinning_shot", "name": "Pinning Shot", "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A heavy bolt that pins the target. Deals 5 damage and applies 2 Poison.",
        "effects": { "damage": 5, "poison": 2 }
      },
      {
        "id": "suppressive_volley", "name": "Suppressive Volley", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "Rain bolts on a row. Deals 2 damage to target and all enemies in same row.",
        "effects": { "damage": 2, "splashRow": true }
      },
      {
        "id": "fire_bolt", "name": "Fire Bolt", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A flaming bolt. Deals 4 damage and applies 3 Poison.",
        "effects": { "damage": 4, "poison": 3 }
      },
      {
        "id": "armor_piercer", "name": "Armor Piercer",
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A bolt designed to punch through shields. Deals 4 damage, ignores block.",
        "effects": { "damage": 4, "pierceBlock": 99 }
      },
      {
        "id": "scorpio_bolt", "name": "Scorpio Bolt", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 6+. A siege bolt that pierces the line. Deals 5 damage to target and the enemy directly behind.",
        "effects": { "damage": 5, "pierceRow": true }
      },
      {
        "id": "concussive_shot", "name": "Concussive Shot", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "single_enemy",
        "description": "A blunt-tipped bolt. Deals 3 damage and knocks front-row enemy to back row.",
        "effects": { "damage": 3, "knockback": true }
      },
      {
        "id": "siege_shot", "name": "Siege Shot", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. A devastating siege bolt. Deals 12 damage.",
        "effects": { "damage": 12 }
      }
    ]
  },
  "praetorian": {
    "name": "Praetorian",
    "title": "PRA",
    "maxHp": 30,
    "tags": ["melee", "elite", "roman"],
    "equipSlots": { "weapon": 2, "armor": 4, "trinket": 1 },
    "hidden": true,
    "unlockCondition": "Beat March 5",
    "description": "Imperial bodyguard. The Emperor's finest, forged in blood and loyalty.",
    "passive": {
      "name": "Unyielding",
      "description": "Cannot be downed in one hit. If a single attack would down this unit, survive with 1 HP instead (once per encounter)."
    },
    "skills": [
      {
        "id": "gladius_imperialis", "name": "Gladius Imperialis", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Strike with the imperial blade. Deals 4 damage.",
        "effects": { "damage": 4 }
      },
      {
        "id": "shield_of_rome", "name": "Shield of Rome", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "self",
        "description": "Raise the praetorian shield. Gain 6 Block.",
        "effects": { "block": 6 }
      },
      {
        "id": "imperial_thrust", "name": "Imperial Thrust", "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "A precise thrust to the throat. Deals 8 damage.",
        "effects": { "damage": 8 }
      },
      {
        "id": "praetorian_guard", "name": "Praetorian Guard", "cooldown": 2,
        "cost": { "type": "exact", "val": 4 }, "target": "all_allies",
        "description": "All allies gain 4 Block. Taunt all enemies.",
        "effects": { "blockAll": 4, "taunt": true }
      },
      {
        "id": "execute", "name": "Execute", "cooldown": 2,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Execute a weakened foe. Deals 6 damage. Ignores block.",
        "effects": { "damage": 6, "pierceBlock": 99 }
      },
      {
        "id": "roman_discipline", "name": "Roman Discipline", "cooldown": 3,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. All allies gain 3 Block, +1 damage for next 2 attacks, +8 Morale.",
        "effects": { "blockAll": 3, "buffAllies": { "bonusDamage": 1, "attacks": 2 }, "morale": 8 }
      },
      {
        "id": "wrath_of_rome", "name": "Wrath of Rome", "cooldown": 3,
        "cost": { "type": "combined", "min": 9, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 9+. The full fury of Rome. Deals 14 damage. Ignores block.",
        "effects": { "damage": 14, "pierceBlock": 99 }
      }
    ]
  }
};
