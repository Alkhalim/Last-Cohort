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
      },
      {
        "id": "precision_drill", "name": "Precision Drill", "cooldown": 1,
        "cost": { "type": "consecutive" }, "target": "single_enemy",
        "description": "Requires consecutive dice. Deal damage equal to the higher die. Gain Block equal to the lower die.",
        "effects": { "precisionDrill": true }
      },
      {
        "id": "fortified_strike", "name": "Fortified Strike",
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Gain 2 Block. Deal damage equal to your current Block.",
        "effects": { "damage": 0, "fortifiedStrike": true }
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
        "description": "All allies gain +3 damage on their next attack.",
        "effects": { "buffAllies": { "bonusDamage": 3, "attacks": 1 } }
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
        "effects": { "blockAll": 7, "morale": -5, "blockScale": 1.3 }
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
      },
      {
        "id": "tactical_preparation", "name": "Tactical Preparation", "cooldown": 3,
        "cost": { "type": "range", "min": 3, "max": 5 }, "target": "all_allies",
        "description": "Prepare the cohort. Gain +2 bonus dice next turn. +5 Morale.",
        "effects": { "bonusDiceNext": 2, "morale": 5 }
      },
      {
        "id": "iron_discipline", "name": "Iron Discipline", "cooldown": 3,
        "cost": { "type": "exact", "val": 4 }, "target": "all_allies",
        "description": "All allies clear poison and stun. +5 Morale.",
        "effects": { "cleanseAll": true, "morale": 5 }
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
        "cost": { "type": "exact", "val": 1 }, "target": "single_ally", "targetOthers": true,
        "description": "Sacrifice 4 HP to heal another ally for 10 HP and grant 3 Block.",
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
        "description": "Give 6 HP and 3 Block to an ally. Costs you 6 HP.",
        "effects": { "transfusion": 6, "block": 3 }
      },
      {
        "id": "triage_strike", "name": "Triage Strike", "cooldown": 1,
        "cost": { "type": "range", "min": 3, "max": 5 }, "target": "all_enemies",
        "ignoreRow": true,
        "description": "Deal 5 damage to the weakest enemy. Heal the most wounded ally for 5 HP.",
        "effects": { "triageStrike": 5 }
      },
      {
        "id": "calculated_dosage", "name": "Calculated Dosage",
        "cost": { "type": "exact", "val": 3 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Apply poison equal to the number of different die values in your pool. If all dice are unique, also deal 4 damage.",
        "effects": { "calculatedDosage": true }
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
        "id": "flaming_arrow", "name": "Flaming Arrow", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deals 7 damage and applies 3 Poison. Poison splashes to all other enemies.",
        "effects": { "damage": 7, "poison": 3, "poisonSplash": 3 }
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
      },
      {
        "id": "trick_shot", "name": "Trick Shot",
        "cost": { "type": "exact", "val": 1 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Ricochet arrow. Deal 2 damage, bouncing to a new target for each additional 1 in your dice pool.",
        "effects": { "damage": 2, "trickShot": true, "bonusDmgScale": 0.35 }
      },
      {
        "id": "wilderness_instinct", "name": "Wilderness Instinct", "cooldown": 3,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "self",
        "description": "Take cover. Take 50% less damage this enemy turn. Next turn, heal 4 HP and gain 4 Block.",
        "effects": { "wildernessInstinct": true }
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
      },
      {
        "id": "fortunes_favor", "name": "Fortune's Favor", "cooldown": 3,
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "Reroll all unused dice and gain +1 bonus die this turn. +8 Morale.",
        "effects": { "fortunesFavor": true, "morale": 8 }
      },
      {
        "id": "eagles_blessing", "name": "Eagle's Blessing", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "self",
        "description": "Free action. Heal 3 HP, gain 3 Block, +1 damage for 2 attacks, +4 Morale. Act again this turn.",
        "effects": { "heal": 3, "block": 3, "buffSelf": { "bonusDamage": 1, "attacks": 2 }, "morale": 4, "freeAction": true }
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
      },
      {
        "id": "harmonic_frequency", "name": "Harmonic Frequency", "cooldown": 2,
        "cost": { "type": "pair" }, "target": "single_enemy",
        "description": "Requires a pair. Even pairs: heal all allies for the pair value. Odd pairs: apply pair value as poison to all enemies. Act again.",
        "effects": { "harmonicFrequency": true, "freeAction": true }
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
        "effects": { "damage": 2, "bonusDmgScale": 0.65 }
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
        "description": "Trample a front-line enemy. Deals 4 damage and 25% trample damage to enemies beside it.",
        "effects": { "damage": 4, "splashAdjacentPct": 0.25 }
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
      },
      {
        "id": "flanking_strike", "name": "Flanking Strike", "cooldown": 2,
        "cost": { "type": "range", "min": 2, "max": 3 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Deal 3 damage. Double damage if target is in back row. Gain 3 Block if target is in front row.",
        "effects": { "damage": 3, "flankingStrike": true, "bonusDmgScale": 0.65 }
      },
      {
        "id": "scouting_maneuver", "name": "Scouting Maneuver", "cooldown": 2,
        "cost": { "type": "exact", "val": 2 }, "target": "all_enemies",
        "description": "Mark a random enemy. Gain +3 damage for next 2 attacks. Act again this turn.",
        "effects": { "scoutingManeuver": true, "freeAction": true }
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
      },
      {
        "id": "spotters_call", "name": "Spotter's Call", "cooldown": 1,
        "cost": { "type": "exact", "val": 1 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Mark target. All allies deal +20% damage to it this turn. Heal self 3 HP.",
        "effects": { "markTarget": true, "healSelf": 3 }
      },
      {
        "id": "devastator_volley", "name": "Devastator Volley", "cooldown": 3,
        "cost": { "type": "combined", "min": 10, "dice": 3 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "3 dice totaling 10+. Fire a massive bolt. Deals 10 damage to target and pierces to the enemy behind. Both take splash damage to adjacent enemies. Skip your next turn.",
        "effects": { "damage": 10, "pierceRow": true, "splashAdjacentPct": 0.5, "skipNextTurn": true }
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
      },
      {
        "id": "imperial_decree", "name": "Imperial Decree", "cooldown": 3,
        "cost": { "type": "combined", "min": 10, "dice": 3 }, "target": "all_allies",
        "description": "3 dice totaling 10+. Command both allies to strike. Each ally immediately deals their basic attack at full damage.",
        "effects": { "imperialDecree": true }
      },
      {
        "id": "last_stand", "name": "Last Stand", "cooldown": 4,
        "cost": { "type": "pairExact6" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Requires two 6s. If HP is below 30%, deal 20 damage ignoring block. Heal for half dealt. (Below 9 HP to activate)",
        "effects": { "damage": 20, "pierceBlock": 99, "lastStand": true }
      }
    ]
  },

  // === NEW CLASSES ===

  "wulfswestr": {
    "name": "Wulfswestr",
    "title": "WLF",
    "maxHp": 25,
    "tags": ["melee", "support", "germanic"],
    "complexity": 2,
    "equipSlots": { "weapon": 2, "armor": 2, "trinket": 3 },
    "description": "Germanic forest fighter. Heals and fights with equal ferocity. No Roman gear.",
    "passive": {
      "name": "Forest-Born",
      "description": "+1 damage per march completed. Healing on self is doubled."
    },
    "skills": [
      {
        "id": "axe_strike", "name": "Axe Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic axe strike. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "herb_poultice", "name": "Herb Poultice", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_ally",
        "description": "Heal ally for 4 HP. Poison a random enemy.",
        "effects": { "heal": 4, "herbPoulticePoison": true, "bonusHealScale": 0.65 }
      },
      {
        "id": "shield_bash_wlf", "name": "Shield Bash", "starter": true,
        "cost": { "type": "odd" }, "target": "single_enemy",
        "description": "Deal 2 + die value damage. Gain 2 Block, depending on die used.",
        "effects": { "damage": 2, "dieScaleDamage": true, "block": 2 }
      },
      {
        "id": "wild_roots", "name": "Wild Roots",
        "cost": { "type": "exact", "val": 2 }, "target": "single_ally", "cooldown": 1,
        "description": "Heal ally for HP equal to die value. Grant Block equal to die value.",
        "effects": { "heal": 0, "dieScaleHeal": true, "block": 0, "dieScaleBlock": true, "bonusHealScale": 0.65 }
      },
      {
        "id": "wolfbite", "name": "Wolfbite", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "description": "Deal 5 damage. If target has Block, apply 5 Poison instead of bonus damage.",
        "effects": { "damage": 5, "wolfbite": true }
      },
      {
        "id": "forest_shroud", "name": "Forest Shroud", "cooldown": 2,
        "cost": { "type": "exact", "val": 4 }, "target": "all_allies",
        "description": "All allies take 40% less damage this enemy turn. +5 Morale.",
        "effects": { "damageShield": 0.4, "morale": 5 }
      },
      {
        "id": "axe_throw", "name": "Axe Throw", "cooldown": 1,
        "cost": { "type": "range", "min": 3, "max": 4 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Throw axe at any target. Deals 5 damage.",
        "effects": { "damage": 5 }
      },
      {
        "id": "twinned_herbs", "name": "Twinned Herbs", "cooldown": 2,
        "cost": { "type": "even" }, "target": "all_allies",
        "description": "Heal all allies for 3 HP. Cleanse all poison.",
        "effects": { "healAll": 3, "cleanseAll": true, "bonusHealScale": 0.45 }
      },
      {
        "id": "berserkers_howl", "name": "Berserker's Howl", "cooldown": 3,
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "Others gain +2 damage for 2 attacks. Wulfswestr gains +4 damage for 2 attacks. -8 Morale.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 2 }, "buffSelf": { "bonusDamage": 4, "attacks": 2 }, "morale": -8, "bonusDmgScale": 0.45 }
      },
      {
        "id": "shield_wall_dance", "name": "Shield Wall Dance", "cooldown": 2,
        "cost": { "type": "pair" }, "target": "self",
        "description": "Gain Block equal to pair value x2. Taunt.",
        "effects": { "shieldWallDance": true, "taunt": true }
      },
      {
        "id": "heart_of_forest", "name": "Heart of the Forest", "cooldown": 3,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_ally",
        "description": "2 dice totaling 7+. Heal target for 10 HP. Grant 5 Block. Revive downed ally at 20% HP.",
        "effects": { "heal": 10, "block": 5, "revive": true, "bonusHealScale": 0.45 }
      },
      {
        "id": "predators_pounce", "name": "Predator's Pounce", "cooldown": 2,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deal 11 damage. Bonus damage equal to 50% of your Block.",
        "effects": { "damage": 11, "predatorsPounce": true }
      }
    ]
  },

  "vestalis": {
    "name": "Vestalis",
    "title": "VES",
    "maxHp": 22,
    "tags": ["command", "support", "roman"],
    "complexity": 3,
    "equipSlots": { "weapon": 1, "armor": 2, "trinket": 4 },
    "description": "Vestal priestess. Morale engine, healer, and divine protector.",
    "passive": {
      "name": "Sacred Flame",
      "description": "Start of each turn, heal the lowest HP ally for 2 HP. Morale cannot drop below -50."
    },
    "skills": [
      {
        "id": "flame_touch", "name": "Flame Touch", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Deal 1 damage. Heal a random damaged ally for 1 HP. +3 Morale.",
        "effects": { "damage": 1, "flameTouch": true, "morale": 3, "bonusDmgScale": 0.2 }
      },
      {
        "id": "prayer_of_mending", "name": "Prayer of Mending", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "single_ally",
        "description": "Heal ally for 3 HP. +3 Morale.",
        "effects": { "heal": 3, "morale": 3 }
      },
      {
        "id": "sacred_ward", "name": "Sacred Ward", "starter": true, "cooldown": 1,
        "cost": { "type": "even" }, "target": "all_allies",
        "description": "Requires even die. All allies gain 3 Block. +4 Morale.",
        "effects": { "blockAll": 3, "morale": 4 }
      },
      {
        "id": "vestas_judgment", "name": "Vesta's Judgment", "cooldown": 1,
        "cost": { "type": "exact", "val": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Deal 4 damage. +66% at 50+ Morale. Another +66% at 75+ Morale.",
        "effects": { "damage": 4, "vestasJudgment": true }
      },
      {
        "id": "purifying_flame", "name": "Purifying Flame", "cooldown": 1,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "Cleanse all poison and stun. Apply 2 Poison to all enemies. +5 Morale.",
        "effects": { "cleanseAll": true, "poisonAll": 2, "morale": 5 }
      },
      {
        "id": "divine_intercession", "name": "Divine Intercession", "cooldown": 2,
        "cost": { "type": "exact", "val": 4 }, "target": "single_ally",
        "description": "Target takes 50% less damage this turn. If hit, attacker takes 4 damage.",
        "effects": { "damageShield": 0.5, "divineIntercession": 4 }
      },
      {
        "id": "litany_of_courage", "name": "Litany of Courage",
        "cost": { "type": "odd" }, "target": "all_allies",
        "description": "Requires odd die. +Morale equal to die value x2. Grant an ally an extra action, depending on die used.",
        "effects": { "litanyOfCourage": true }
      },
      {
        "id": "rite_of_consecration", "name": "Rite of Consecration", "cooldown": 3,
        "cost": { "type": "combined", "min": 10, "dice": 3 }, "target": "all_allies",
        "description": "3 dice totaling 10+. All allies +2 damage for 3 attacks. +12 Morale. Heal all 3 HP.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 3 }, "morale": 12, "healAll": 3 }
      },
      {
        "id": "flame_shield", "name": "Flame Shield", "cooldown": 3,
        "cost": { "type": "pair" }, "target": "all_allies",
        "description": "All allies gain Block equal to pair value. +Morale equal to pair value. +1 die next turn.",
        "effects": { "flameShield": true, "bonusDiceNext": 1 }
      },
      {
        "id": "wrath_of_vesta", "name": "Wrath of Vesta", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "all_enemies",
        "description": "2 random enemies take 2 Poison. +50% at 50+ Morale, +50% at 75+ Morale.",
        "effects": { "wrathOfVesta": true }
      },
      {
        "id": "resurrection_prayer", "name": "Resurrection Prayer", "cooldown": 5,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_ally",
        "description": "2 dice totaling 8+. Revive downed ally at 30% HP with Block. +10 Morale. Vestalis loses HP equal to ally's revived HP, gains that as Block.",
        "effects": { "revive": true, "morale": 10, "resurrectionPrayer": true }
      },
      {
        "id": "eternal_flame", "name": "Eternal Flame", "cooldown": 4,
        "cost": { "type": "combined", "min": 9, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 9+. Free action. Heal all 6 HP, gain 4 Block, +15 Morale. Act again.",
        "effects": { "healAll": 6, "blockAll": 4, "morale": 15, "freeAction": true }
      }
    ]
  },

  "arcania": {
    "name": "Arcania",
    "title": "ARC",
    "maxHp": 19,
    "tags": ["ranged", "roman"],
    "complexity": 3,
    "equipSlots": { "weapon": 2, "armor": 1, "trinket": 4 },
    "description": "Roman frontier scout. Intelligence, poison, and battlefield control.",
    "passive": {
      "name": "Intelligence Network",
      "description": "Once per encounter, when an enemy uses its strongest attack, reduce damage by 40%."
    },
    "skills": [
      {
        "id": "throwing_knife", "name": "Throwing Knife", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Deal 2 damage. Apply 1 Poison.",
        "effects": { "damage": 2, "poison": 1 }
      },
      {
        "id": "reconnaissance", "name": "Reconnaissance", "starter": true, "cooldown": 1,
        "cost": { "type": "exact", "val": 1 }, "target": "all_enemies",
        "description": "Mark a random enemy (+20% damage from all). Gain 2 Block. +1 die next turn.",
        "effects": { "scoutingManeuver": true, "block": 2, "bonusDiceNext": 1 }
      },
      {
        "id": "nerve_strike", "name": "Nerve Strike", "starter": true, "cooldown": 1,
        "cost": { "type": "range", "min": 3, "max": 4 }, "target": "single_enemy",
        "description": "Deal 4 damage. Target deals 30% less damage for 1 turn. Front row only.",
        "effects": { "damage": 4, "cripple": 1, "bonusDmgScale": 0.5 }
      },
      {
        "id": "misdirection", "name": "Misdirection", "cooldown": 2,
        "cost": { "type": "exact", "val": 2 }, "target": "single_ally",
        "description": "Give ally Taunt. They gain 3 Block per living enemy.",
        "effects": { "misdirection": true }
      },
      {
        "id": "laced_blade", "name": "Laced Blade", "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "description": "Deal 3 damage. Apply Poison equal to die value used, depending on die used.",
        "effects": { "damage": 3, "lacedBlade": true }
      },
      {
        "id": "dead_drop", "name": "Dead Drop", "cooldown": 2,
        "cost": { "type": "exact", "val": 1 }, "target": "self",
        "description": "Free action. Heal 4 HP. Become untargetable this enemy turn. Act again.",
        "effects": { "healSelf": 4, "freeAction": true, "deadDrop": true }
      },
      {
        "id": "smoke_bomb", "name": "Smoke Bomb", "cooldown": 3,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "All allies gain 3 Block. All enemies have 30% chance to miss.",
        "effects": { "blockAll": 3, "smokeScreen": 0.3 }
      },
      {
        "id": "expose_weakness", "name": "Expose Weakness", "cooldown": 2,
        "cost": { "type": "consecutive" }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Requires consecutive dice. Deal 3 damage. Condemn target (+30% from all, 2 turns).",
        "effects": { "damage": 3, "condemn": 2 }
      },
      {
        "id": "shadow_network", "name": "Shadow Network", "cooldown": 3,
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 5+. Allies apply 2 Poison on attack for 2 attacks. Mark all enemies. +1 die next turn.",
        "effects": { "shadowNetwork": true, "bonusDiceNext": 1 }
      },
      {
        "id": "assassination", "name": "Assassination", "cooldown": 2,
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 7+. Deal 4 damage, ignoring block. Triple damage to marked or condemned targets.",
        "effects": { "damage": 4, "pierceBlock": 99, "assassination": true, "halfBonusDmg": true }
      },
      {
        "id": "contingency_plan", "name": "Contingency Plan", "cooldown": 3,
        "cost": { "type": "exact", "val": 4 }, "target": "all_allies",
        "description": "If any ally would be downed this enemy turn, prevent it (1 HP). Lasts 1 turn.",
        "effects": { "contingencyPlan": true }
      },
      {
        "id": "deep_cover", "name": "Deep Cover", "cooldown": 4,
        "cost": { "type": "combined", "min": 9, "dice": 2 }, "target": "self",
        "description": "2 dice totaling 9+. Gain 3 extra dice this turn and next turn. Stunned both turns.",
        "effects": { "deepCover": true }
      }
    ]
  },

  "cataphract": {
    "name": "Cataphract",
    "title": "CAT",
    "maxHp": 28,
    "tags": ["command", "elite", "roman"],
    "complexity": 3,
    "equipSlots": { "weapon": 2, "armor": 4, "trinket": 1 },
    "hidden": true,
    "unlockCondition": "Defeat the Corpse of Arminius",
    "description": "Heavy cavalry officer. Mobile fortress that commands from the saddle.",
    "passive": {
      "name": "Iron Vanguard",
      "description": "First action each combat gives all allies +3 Block. Whenever this unit gains Block, gain +1 damage for next attack."
    },
    "skills": [
      {
        "id": "kontos_strike", "name": "Kontos Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Deal 4 damage. Gain 2 Block.",
        "effects": { "damage": 4, "block": 2, "halfBonusDmg": true }
      },
      {
        "id": "formation_command", "name": "Formation Command", "starter": true, "cooldown": 1,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "Other allies gain 3 Block. +4 Morale.",
        "effects": { "blockAll": 3, "blockOthersOnly": true, "morale": 4 }
      },
      {
        "id": "heavy_charge", "name": "Heavy Charge", "starter": true, "cooldown": 1,
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "description": "Deal 7 damage. Knock target to back row.",
        "effects": { "damage": 7, "knockback": true }
      },
      {
        "id": "iron_curtain", "name": "Iron Curtain",
        "cost": { "type": "even" }, "target": "self",
        "description": "Requires even die. Gain 3 + die value Block. +1 die next turn, depending on die used.",
        "effects": { "block": 3, "dieScaleBlock": true, "bonusDiceNext": 1, "blockScale": 0.65 }
      },
      {
        "id": "rally_the_line", "name": "Rally the Line", "cooldown": 2,
        "cost": { "type": "exact", "val": 3 }, "target": "all_allies",
        "description": "Other allies gain +2 damage for 2 attacks. Others gain 2 Block.",
        "effects": { "buffAllies": { "bonusDamage": 2, "attacks": 2 }, "blockAll": 2, "blockOthersOnly": true }
      },
      {
        "id": "mounted_sweep", "name": "Mounted Sweep", "cooldown": 1,
        "cost": { "type": "range", "min": 3, "max": 4 }, "target": "all_enemies",
        "description": "Deal 3 damage to all front row enemies. Gain 1 Block per enemy hit.",
        "effects": { "damageAll": 3, "mountedSweep": true, "halfBonusDmg": true }
      },
      {
        "id": "armored_advance", "name": "Armored Advance", "cooldown": 3,
        "cost": { "type": "pair" }, "target": "all_allies",
        "description": "All allies gain Block equal to pair value. Cataphract gains double. +5 Morale. Roll an extra die.",
        "effects": { "armoredAdvance": true, "morale": 5 }
      },
      {
        "id": "destriers_fury", "name": "Destrier's Fury", "cooldown": 2,
        "cost": { "type": "exact", "val": 6 }, "target": "single_enemy",
        "description": "Strip all Block from target. Deal damage equal to the Block removed.",
        "effects": { "destriersFury": true }
      },
      {
        "id": "officers_shield", "name": "Officer's Shield", "cooldown": 1,
        "cost": { "type": "exact", "val": 4 }, "target": "single_ally",
        "description": "Grant ally 6 Block. Intercept next attack on them. Take half damage.",
        "effects": { "block": 6, "intercept": true }
      },
      {
        "id": "thundering_charge", "name": "Thundering Charge", "cooldown": 3,
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "2 dice totaling 8+. Deal 10 damage. 30% splash to adjacent. +8 Morale. Gain 4 Block.",
        "effects": { "damage": 10, "splashAdjacentPct": 0.3, "morale": 8, "block": 4 }
      },
      {
        "id": "unbreakable_line", "name": "Unbreakable Line", "cooldown": 4,
        "cost": { "type": "combined", "min": 3, "dice": 3 }, "target": "all_allies",
        "description": "3 any dice. All allies gain 6 Block. Cleanse poison and stun. +10 Morale.",
        "effects": { "blockAll": 6, "cleanseAll": true, "morale": 10 }
      },
      {
        "id": "cataphracts_doom", "name": "Cataphract's Doom", "cooldown": 4,
        "cost": { "type": "combined", "min": 10, "dice": 2 }, "target": "all_enemies",
        "description": "2 dice totaling 10+. Deal 8 damage to all enemies. All allies gain Block equal to damage dealt. +12 Morale.",
        "effects": { "damageAll": 8, "cataphractsDoom": true, "morale": 12 }
      }
    ]
  }
};
