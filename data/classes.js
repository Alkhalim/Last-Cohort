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
    "complexity": 1,
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
        "cost": { "type": "even" }, "target": "self",
        "description": "Requires an even die. Gain 3 + die value Block, depending on die used.",
        "effects": { "block": 3, "dieScaleBlock": true }
      },
      {
        "id": "gladius_thrust", "name": "Gladius Thrust", "starter": true,
        "cost": { "type": "odd" }, "target": "single_enemy",
        "description": "Requires an odd die. Precise thrust. Deals 4 + die value damage, depending on die used.",
        "effects": { "damage": 4, "dieScaleDamage": true }
      },
      {
        "id": "hold_fast", "name": "Hold Fast", "cooldown": 1,
        "cost": { "type": "exact", "val": 4 }, "target": "self",
        "description": "Gain 8 Block and Taunt (enemies target this unit).",
        "effects": { "block": 8, "taunt": true }
      },
      {
        "id": "pilum_cast", "name": "Pilum Cast", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Throw pilum at any row. Deals 6 damage.",
        "effects": { "damage": 6, "ignoreRow": true }
      },
      {
        "id": "twin_slash", "name": "Twin Slash", "cooldown": 1,
        "cost": { "type": "pairOdd" }, "target": "dual_enemy",
        "description": "Requires a pair of odd dice. Deals 5 damage to each of two targets.",
        "effects": { "damage": 10, "splitDamage": true }
      },
      {
        "id": "shield_wall", "name": "Shield Wall", "cooldown": 2,
        "cost": { "type": "pairEven" }, "target": "all_allies",
        "description": "Requires a pair of even dice. All allies gain 5 Block.",
        "effects": { "blockAll": 5 }
      },
      {
        "id": "counter_stance", "name": "Counter Stance", "cooldown": 2,
        "cost": { "type": "exact", "val": 3 }, "target": "self",
        "description": "Enter counter stance. If hit this enemy turn, reflect the damage back +2.",
        "effects": { "counterStance": true }
      },
      {
        "id": "sunder", "name": "Sunder",
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "Smash through defenses. Remove all block from target and deal 3 damage.",
        "effects": { "damage": 3, "shieldbreak": true }
      },
      {
        "id": "shoulder_charge", "name": "Shoulder Charge",
        "cost": { "type": "range", "min": 3, "max": 4 }, "target": "single_enemy",
        "description": "Deal 4 damage and knock target to back row. If already back row, deal 6 instead.",
        "effects": { "damage": 4, "shoulderCharge": true }
      }
    ]
  },
  "centurion": {
    "name": "Centurion",
    "title": "CEN",
    "maxHp": 27,
    "tags": ["command", "roman"],
    "complexity": 2,
    "equipSlots": { "weapon": 2, "armor": 2, "trinket": 3 },
    "description": "Officer. Buffs allies and controls the battlefield.",
    "passive": {
      "name": "Discipline of Office",
      "description": "Once per turn, adjust one die by +1 or -1. Only active below 50 morale.",
      "usedThisTurn": false,
      "moraleMax": 50
    },
    "skills": [
      {
        "id": "strike", "name": "Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic strike. Deals 4 damage.",
        "effects": { "damage": 4 }
      },
      {
        "id": "commanding_shout", "name": "Commanding Shout", "starter": true, "cooldown": 3,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "All allies gain +2 damage on their next attack.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 1 } }
      },
      {
        "id": "tighten_ranks", "name": "Tighten Ranks", "starter": true, "cooldown": 1,
        "cost": { "type": "threshold", "min": 4 }, "target": "all_allies",
        "description": "All allies gain 4 Block.",
        "effects": { "blockAll": 4 }
      },
      {
        "id": "officers_care", "name": "Officer's Care", "cooldown": 3,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "All allies heal 2 HP and gain +1 damage for next 3 attacks.",
        "effects": { "healAll": 2, "buffAllies": { "bonusDamage": 1, "attacks": 3 } }
      },
      {
        "id": "measured_advance", "name": "Measured Advance", "cooldown": 2,
        "cost": { "type": "consecutive" }, "target": "single_enemy",
        "description": "Requires two consecutive dice. Deals 8 damage and other allies gain 3 Block.",
        "effects": { "damage": 8, "blockAll": 3, "blockOthersOnly": true }
      },
      {
        "id": "no_retreat", "name": "No Retreat",
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "All allies gain 7 Block. -5 Morale.",
        "effects": { "blockAll": 7, "morale": -5 }
      },
      {
        "id": "rally_cry", "name": "Rally Cry", "cooldown": 3,
        "cost": { "type": "oddEven" }, "target": "all_allies",
        "description": "Requires one odd and one even die. +10 Morale and +1 damage for next 2 attacks.",
        "effects": { "morale": 10, "buffAllies": { "bonusDamage": 1, "attacks": 2 } }
      },
      {
        "id": "decimation_strike", "name": "Decimation Strike", "cooldown": 2,
        "cost": { "type": "combinedExact", "val": 7, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling exactly 7. Deals 17 damage. -5 Morale.",
        "effects": { "damage": 17, "morale": -5, "bonusDmgScale": 1.5 }
      },
      {
        "id": "overwatch", "name": "Overwatch", "cooldown": 1,
        "cost": { "type": "exact", "val": 5 }, "target": "self",
        "description": "Set a watch. The next enemy to deal damage this turn takes 5 damage.",
        "effects": { "overwatch": 5 }
      },
      {
        "id": "press_advantage", "name": "Press the Advantage", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 6+. Suppress target: deals 40% less damage for 2 turns.",
        "effects": { "suppress": 2 }
      }
    ]
  },
  "medicus": {
    "name": "Medicus",
    "title": "MED",
    "maxHp": 23,
    "tags": ["support", "roman"],
    "complexity": 1,
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
        "description": "Heal an ally for HP equal to die value, depending on die used.",
        "effects": { "heal": 0, "dieScaleHeal": true }
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
        "id": "emergency_draught", "name": "Emergency Draught", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_ally",
        "description": "Heal an ally for 7 HP.",
        "effects": { "heal": 7 }
      },
      {
        "id": "plague_flask", "name": "Plague Flask", "cooldown": 1,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Hurl a flask of plague. 4 Poison to target, 2 Poison to all others.",
        "effects": { "poison": 4, "poisonSplash": 2 }
      },
      {
        "id": "sawbones_choice", "name": "Sawbones' Choice", "cooldown": 1,
        "cost": { "type": "exact", "val": 1 }, "target": "single_ally",
        "description": "Sacrifice 4 HP to heal ally for 10 HP and grant 3 Block.",
        "effects": { "heal": 10, "selfDamage": 4, "block": 3 }
      },
      {
        "id": "field_surgery", "name": "Field Surgery", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 4 HP.",
        "effects": { "healAll": 4 }
      },
      {
        "id": "venom_strike", "name": "Venom Strike", "cooldown": 1,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 4 damage and applies 4 Poison.",
        "effects": { "damage": 4, "poison": 4 }
      },
      {
        "id": "stimulant", "name": "Stimulant", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "single_ally",
        "description": "Inject a stimulant. Target ally can act again this turn. Costs 3 HP.",
        "effects": { "stimulant": true, "selfDamage": 3 }
      },
      {
        "id": "transfusion", "name": "Transfusion",
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_ally",
        "description": "Transfer up to 6 HP from yourself to target ally.",
        "effects": { "transfusion": 6 }
      }
    ]
  },
  "sagittarius": {
    "name": "Sagittarius",
    "title": "SAG",
    "maxHp": 22,
    "tags": ["ranged", "roman"],
    "complexity": 2,
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
        "description": "Loose an arrow at any target. Deals damage equal to die value, depending on die used.",
        "effects": { "damage": 0, "dieScaleDamage": true }
      },
      {
        "id": "aimed_shot", "name": "Aimed Shot", "cooldown": 1, "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Carefully aimed shot. Deals 6 damage. Ignores block.",
        "effects": { "damage": 6, "pierceBlock": 99 }
      },
      {
        "id": "poisoned_arrow", "name": "Poisoned Arrow", "starter": true, "cooldown": 1,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A treated arrowhead. Deals 3 damage and applies 2 Poison. Doubles poison if target is already poisoned.",
        "effects": { "damage": 3, "poison": 2, "doublePoison": true }
      },
      {
        "id": "kill_shot", "name": "Kill Shot", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A lethal shot. Deals 5 damage, ignores block. Double damage to marked or poisoned targets.",
        "effects": { "damage": 5, "pierceBlock": 99, "killShot": true }
      },
      {
        "id": "arrow_volley", "name": "Arrow Volley", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_enemies",
        "description": "2 dice totaling 6+. Deals 3 damage to all enemies (light volley).",
        "effects": { "damageAll": 3, "halfBonusDmg": true }
      },
      {
        "id": "mark_target", "name": "Mark Target",
        "cost": { "type": "exact", "val": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Mark and poison a target. Applies 3 Poison and marks for +20% damage next turn.",
        "effects": { "poison": 3, "markTarget": true }
      },
      {
        "id": "flaming_arrow", "name": "Flaming Arrow", "cooldown": 2,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deals 7 damage and applies 3 Poison.",
        "effects": { "damage": 7, "poison": 3 }
      },
      {
        "id": "caltrops", "name": "Caltrops", "cooldown": 2,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "Scatter caltrops across the front line. Target and adjacent enemies are marked (+20% damage). They take 3 damage if they attack.",
        "effects": { "caltrops": 3, "bonusDmgScale": 0.3 }
      },
      {
        "id": "snare_trap", "name": "Snare Trap", "cooldown": 1,
        "cost": { "type": "exact", "val": 2 }, "target": "single_enemy",
        "description": "Set a trap. If target attacks this turn, it takes 4 damage and is stunned next turn.",
        "effects": { "snareTrap": 4 }
      },
      {
        "id": "disengage", "name": "Disengage", "cooldown": 1,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Shoot and brace. Deal 2 damage to a front-row enemy and gain 4 Block.",
        "effects": { "damage": 2, "block": 4 }
      }
    ]
  },
  "signifer": {
    "name": "Signifer",
    "title": "SIG",
    "maxHp": 25,
    "tags": ["command", "roman"],
    "complexity": 3,
    "equipSlots": { "weapon": 1, "armor": 3, "trinket": 3 },
    "description": "Standard Bearer. Rallies the cohort with morale and buffs.",
    "passive": {
      "name": "Standard of the Legion",
      "description": "+1 extra die per turn while morale is 25+.",
      "extraDice": true,
      "moraleThreshold": 25
    },
    "skills": [
      {
        "id": "standard_strike", "name": "Standard Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Strike with the standard. Deals 2 damage. +2 Morale.",
        "effects": { "damage": 2, "morale": 2 }
      },
      {
        "id": "raise_the_eagle", "name": "Raise the Eagle", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "Raise the eagle standard. +11 Morale. Gain 3 Block.",
        "effects": { "morale": 11, "block": 3 }
      },
      {
        "id": "inspire", "name": "Inspire", "starter": true, "cooldown": 5,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "Inspire the troops. All allies gain +1 damage for next 4 attacks.",
        "effects": { "buffAllies": { "bonusDamage": 1, "attacks": 4 } }
      },
      {
        "id": "shield_the_standard", "name": "Shield the Standard",
        "cost": { "type": "threshold", "min": 4 }, "target": "all_allies",
        "description": "Other allies gain 3 Block. +5 Morale.",
        "effects": { "blockAll": 3, "blockOthersOnly": true, "morale": 5 }
      },
      {
        "id": "battle_hymn", "name": "Battle Hymn", "cooldown": 5,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 7+. +15 Morale, all allies gain +3 damage for next 3 attacks.",
        "effects": { "morale": 15, "buffAllies": { "bonusDamage": 3, "attacks": 3 } }
      },
      {
        "id": "defiant_stand", "name": "Defiant Stand", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "All allies gain 6 Block. If morale is 50+, also heal all allies for 2 HP.",
        "effects": { "blockAll": 6, "moraleHealAll": 2 }
      },
      {
        "id": "standard_charge", "name": "Standard Charge", "cooldown": 1,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 9 damage. Deals up to 2.5x damage at full morale.",
        "effects": { "damage": 9, "moraleScaling": true }
      },
      {
        "id": "rally_fallen", "name": "Rally the Fallen", "cooldown": 5,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_ally",
        "description": "2 dice totaling 8+. Revive a downed ally at 25% HP with equal Block. -15 Morale.",
        "effects": { "revive": true, "morale": -15 }
      },
      {
        "id": "sacrifice_standard", "name": "Sacrifice the Standard", "cooldown": 5,
        "cost": { "type": "any" }, "target": "all_enemies",
        "description": "Spend 50 Morale to deal 8 damage to all enemies. Consumes all damage buffs.",
        "effects": { "damageAll": 8, "moraleCost": 50, "consumeAllBuffs": true }
      },
      {
        "id": "martyrs_banner", "name": "Martyr's Banner", "cooldown": 3,
        "cost": { "type": "exact", "val": 1 }, "target": "all_allies",
        "description": "Sacrifice 5 HP. All allies gain +2 damage for 2 attacks and 4 Block.",
        "effects": { "selfDamage": 5, "buffAllies": { "bonusDamage": 2, "attacks": 2 }, "blockAll": 4 }
      }
    ]
  },
  "cornicen": {
    "name": "Cornicen",
    "title": "COR",
    "maxHp": 23,
    "tags": ["support", "roman"],
    "complexity": 3,
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
        "description": "Sound the battle horn. Heal all allies for 1 HP and grant 1 Block.",
        "effects": { "healAll": 1, "blockAll": 1 }
      },
      {
        "id": "war_drums", "name": "War Drums", "cooldown": 3, "starter": true,
        "cost": { "type": "exact", "val": 5 }, "target": "all_allies",
        "description": "Beat the war drums. All allies gain +3 damage for next attack. Shatters all enemy block.",
        "effects": { "buffAllies": { "bonusDamage": 3, "attacks": 1 }, "shieldbreakAll": true }
      },
      {
        "id": "shrieking_note", "name": "Shrieking Note",
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A piercing shriek. Deals 4 damage to target. Applies 1 Poison to all other enemies.",
        "effects": { "damage": 4, "poisonSplash": 1 }
      },
      {
        "id": "rallying_trumpet", "name": "Rallying Trumpet", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 6 HP. +11 Morale.",
        "effects": { "healAll": 6, "morale": 11 }
      },
      {
        "id": "cacophony", "name": "Cacophony", "cooldown": 1,
        "cost": { "type": "exact", "val": 1 }, "target": "all_enemies",
        "description": "A cacophony of noise. Deals 1 damage and applies 1 Poison to all enemies.",
        "effects": { "damageAll": 1, "poisonAll": 1 }
      },
      {
        "id": "dissonant_blast", "name": "Dissonant Blast", "cooldown": 2,
        "cost": { "type": "exact", "val": 1 }, "target": "single_enemy",
        "description": "A jarring horn note. Deals 2 damage and stuns the target.",
        "effects": { "damage": 2, "stun": true }
      },
      {
        "id": "deafening_blast", "name": "Deafening Blast", "cooldown": 3,
        "cost": { "type": "exact", "val": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A deafening blast at any target. Deals 4 damage, half to adjacent enemies. All enemies' morale attacks nullified for 2 turns.",
        "effects": { "damage": 4, "splashAdjacentPct": 0.5, "deafenAll": 2 }
      },
      {
        "id": "resonance", "name": "Resonance", "cooldown": 1,
        "cost": { "type": "range", "min": 4, "max": 6 }, "target": "single_ally",
        "description": "Mark an ally. The next heal they receive is doubled. Grant Block equal to die value, depending on die used.",
        "effects": { "resonance": true, "block": 0, "dieScaleBlock": true }
      },
      {
        "id": "echoing_blast", "name": "Echoing Blast", "cooldown": 2,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deal 3 damage. If target dies, deal 3 damage to a random other enemy.",
        "effects": { "damage": 3, "echoOnKill": 3 }
      }
    ]
  },
  "equites": {
    "name": "Equites",
    "title": "EQU",
    "maxHp": 25,
    "tags": ["melee", "roman"],
    "complexity": 2,
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
        "description": "A quick lance jab at any target. Deals 2 damage (light strike).",
        "effects": { "damage": 2, "halfBonusDmg": true }
      },
      {
        "id": "charging_strike", "name": "Charging Strike", "starter": true, "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A powerful charging blow. Deals 8 damage.",
        "effects": { "damage": 8 }
      },
      {
        "id": "trample", "name": "Trample", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "Trample a front-line enemy. Deals 4 damage and 20% trample damage to enemies beside it.",
        "effects": { "damage": 4, "splashAdjacentPct": 0.2 }
      },
      {
        "id": "hit_and_run", "name": "Hit and Run", "cooldown": 1,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Strike and wheel away. Deals 3 damage and gain 3 Block.",
        "effects": { "damage": 3, "block": 3 }
      },
      {
        "id": "reckless_charge", "name": "Reckless Charge", "cooldown": 3,
        "cost": { "type": "exact", "val": 6 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Requires a 6. A wild, reckless charge. Deals 14 damage to any target. Take 4 self-damage.",
        "effects": { "damage": 14, "selfDamage": 4, "halfScaleSelfDamage": true }
      },
      {
        "id": "overrun", "name": "Overrun",
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Ride down a target. Deals 3 damage. Deals bonus damage for each other die matching the one used.",
        "effects": { "damage": 3, "overrun": true }
      },
      {
        "id": "rally_charge", "name": "Rally Charge", "cooldown": 2,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deals 8 damage. +10 Morale.",
        "effects": { "damage": 8, "morale": 10 }
      },
      {
        "id": "drag_down", "name": "Drag Down", "cooldown": 1,
        "cost": { "type": "exact", "val": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Drag a back-row enemy to the front row. Deal 2 damage.",
        "effects": { "damage": 2, "pullToFront": true }
      },
      {
        "id": "cavalry_escape", "name": "Cavalry Escape", "cooldown": 4,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 5+. All allies take 50% less damage during the next enemy turn.",
        "effects": { "damageShield": 0.5 }
      },
      {
        "id": "warhorse_kick", "name": "Warhorse Kick", "cooldown": 3,
        "cost": { "type": "range", "min": 3, "max": 4 }, "target": "single_enemy",
        "description": "Kick target and a random other front-row enemy. Both are stunned next turn.",
        "effects": { "warhorseKick": true }
      }
    ]
  },
  "ballistarius": {
    "name": "Ballistarius",
    "title": "BAL",
    "maxHp": 20,
    "tags": ["ranged", "roman"],
    "complexity": 3,
    "equipSlots": { "weapon": 2, "armor": 1, "trinket": 4 },
    "description": "Roman siege crossbowman. Every hit weakens the enemy, reducing their damage.",
    "passive": {
      "name": "Pinning Fire",
      "description": "Enemies damaged by this unit deal 15% less damage on their next action."
    },
    "skills": [
      {
        "id": "ballista_bolt", "name": "Ballista Bolt", "starter": true, "cooldown": 1,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Fire a heavy bolt at any target. Deals 5 damage.",
        "effects": { "damage": 5 }
      },
      {
        "id": "pinning_shot", "name": "Pinning Shot", "starter": true, "cooldown": 3,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "A heavy bolt that pins the target. Deals 5 damage. Target deals 30% less damage for next 2 actions.",
        "effects": { "damage": 5, "cripple": 2 }
      },
      {
        "id": "suppressive_volley", "name": "Suppressive Volley", "starter": true,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "Rain bolts on the front row. Deals 2 damage to target and all enemies in the same row.",
        "effects": { "damage": 2, "splashRow": true }
      },
      {
        "id": "burning_pitch", "name": "Burning Pitch", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Hurl burning pitch. Deals 4 damage and applies 3 Poison.",
        "effects": { "damage": 4, "poison": 3 }
      },
      {
        "id": "brace_position", "name": "Brace Position", "cooldown": 1,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "self",
        "description": "Hunker behind the siege weapon. Gain 5 Block and +2 damage on next attack.",
        "effects": { "block": 5, "buffSelf": { "bonusDamage": 2, "attacks": 1 } }
      },
      {
        "id": "scorpio", "name": "Scorpio", "cooldown": 1,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 6+. A siege shot that pierces the line. Deals 5 damage to target and the enemy directly behind.",
        "effects": { "damage": 5, "pierceRow": true }
      },
      {
        "id": "concussive_shot", "name": "Concussive Shot", "cooldown": 1,
        "cost": { "type": "exact", "val": 6 }, "target": "single_enemy",
        "description": "A blunt-tipped bolt. Deals 3 damage and knocks front-row enemy to back row.",
        "effects": { "damage": 3, "knockback": true }
      },
      {
        "id": "siege_shot", "name": "Siege Shot", "cooldown": 2,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. A devastating siege bolt. Deals 12 damage.",
        "effects": { "damage": 12 }
      },
      {
        "id": "staggering_shot", "name": "Staggering Shot", "cooldown": 1,
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "description": "A heavy impact that dazes. Deals 3 damage and stuns the target next turn.",
        "effects": { "damage": 3, "stun": true }
      },
      {
        "id": "smokescreen", "name": "Smokescreen", "cooldown": 2,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_enemies",
        "ignoreRow": true,
        "description": "2 dice totaling 6+. All enemies have 40% chance to miss their next attack.",
        "effects": { "smokeScreen": 0.4 }
      }
    ]
  },
  "praetorian": {
    "name": "Praetorian",
    "title": "PRA",
    "maxHp": 30,
    "tags": ["melee", "elite", "roman"],
    "complexity": 3,
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
        "id": "shield_slam", "name": "Shield Slam", "starter": true, "cooldown": 3,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "Bash with the praetorian shield. Deals 4 damage and stuns the target.",
        "effects": { "damage": 4, "stun": true }
      },
      {
        "id": "praetorian_guard", "name": "Praetorian Guard", "cooldown": 1,
        "cost": { "type": "exact", "val": 4 }, "target": "all_allies",
        "description": "All allies gain 4 Block. Taunt all enemies.",
        "effects": { "blockAll": 4, "taunt": true }
      },
      {
        "id": "execute", "name": "Execute", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Execute a weakened foe. Deals 6 damage, ignores block. Double damage to enemies below 25% HP.",
        "effects": { "damage": 6, "pierceBlock": 99, "execute": true }
      },
      {
        "id": "roman_discipline", "name": "Roman Discipline", "cooldown": 4,
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. All allies gain 3 Block, +5 damage for next attack, +8 Morale.",
        "effects": { "blockAll": 3, "buffAllies": { "bonusDamage": 5, "attacks": 1 }, "morale": 8 }
      },
      {
        "id": "wrath_of_rome", "name": "Wrath of Rome", "cooldown": 2,
        "cost": { "type": "combined", "min": 9, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 9+. The full fury of Rome. Deals 14 damage. Ignores block.",
        "effects": { "damage": 14, "pierceBlock": 99 }
      },
      {
        "id": "sacrificial_guard", "name": "Sacrificial Guard", "cooldown": 1,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "self",
        "description": "Intercept the next attack on any ally. Take half damage, reflect half back, stun attacker.",
        "effects": { "intercept": true }
      },
      {
        "id": "avengers_oath", "name": "Avenger's Oath", "cooldown": 2,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deal 10 damage. If any ally is downed, deal 16 instead and ignore block.",
        "effects": { "damage": 10, "avengeDamage": 16, "pierceBlock": 0 }
      },
      {
        "id": "condemn", "name": "Condemn", "cooldown": 4,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deal 4 damage. Target takes +30% damage from all sources for 2 turns.",
        "effects": { "damage": 4, "condemn": 2 }
      }
    ]
  }
};
