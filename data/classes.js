// ============================================================
// Last Cohort – Class Data
// Edit this file to add/modify classes and their skills.
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
        "id": "strike", "name": "Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic sword strike. Deals 3 damage.",
        "effects": { "damage": 3 }
      },
      {
        "id": "shield_brace", "name": "Shield Brace", "starter": true,
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "self",
        "description": "Gain 5 Block. (Die 4 triggers Shield Discipline for +4.)",
        "effects": { "block": 5 },
        "passiveTrigger": { "dieMin": 4, "bonusBlock": 4 }
      },
      {
        "id": "gladius_thrust", "name": "Gladius Thrust", "starter": true,
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "single_enemy",
        "description": "Precise thrust. Deals 6 damage.",
        "effects": { "damage": 6 }
      },
      {
        "id": "hold_fast", "name": "Hold Fast",
        "cost": { "type": "exact", "val": 4 }, "target": "self",
        "description": "Gain 8 Block and Taunt (enemies target this unit).",
        "effects": { "block": 8, "taunt": true }
      },
      {
        "id": "pilum_cast", "name": "Pilum Cast",
        "cost": { "type": "threshold", "min": 5 }, "target": "single_enemy",
        "ignoreRow": true,
        "description": "Throw pilum at any row. Deals 9 damage.",
        "effects": { "damage": 9, "ignoreRow": true }
      },
      {
        "id": "twin_slash", "name": "Twin Slash",
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 10 damage.",
        "effects": { "damage": 10 }
      },
      {
        "id": "shield_wall", "name": "Shield Wall",
        "cost": { "type": "combined", "min": 8, "dice": 2 }, "target": "all_allies",
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
        "id": "strike", "name": "Strike", "starter": true,
        "cost": { "type": "any" }, "target": "single_enemy",
        "description": "Basic strike. Deals 2 damage.",
        "effects": { "damage": 2 }
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
        "description": "All allies gain 3 Block.",
        "effects": { "blockAll": 3 }
      },
      {
        "id": "officers_care", "name": "Officer's Care",
        "cost": { "type": "range", "min": 2, "max": 4 }, "target": "all_allies",
        "description": "All allies heal 1 HP and gain +1 damage on next attack.",
        "effects": { "healAll": 1, "buffAllies": { "bonusDamage": 1, "attacks": 1 } }
      },
      {
        "id": "measured_advance", "name": "Measured Advance",
        "cost": { "type": "combined", "min": 7, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 7+. Deals 11 damage.",
        "effects": { "damage": 11 }
      },
      {
        "id": "no_retreat", "name": "No Retreat",
        "cost": { "type": "exact", "val": 6 }, "target": "all_allies",
        "description": "All allies gain 5 Block and +10 Morale.",
        "effects": { "blockAll": 5, "morale": 10 }
      },
      {
        "id": "rally_cry", "name": "Rally Cry",
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. +15 Morale and +1 damage for next 2 attacks.",
        "effects": { "morale": 15, "buffAllies": { "bonusDamage": 1, "attacks": 2 } }
      },
      {
        "id": "decimation_strike", "name": "Decimation Strike",
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
    "description": "Field surgeon. Heals, poisons, and manages attrition.",
    "passive": {
      "name": "Field Triage",
      "description": "When an ally is downed, gain one free Bind Wounds this encounter.",
      "freeHealAvailable": false
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
        "description": "Applies 3 Poison to an enemy.",
        "effects": { "poison": 3 }
      },
      {
        "id": "triage", "name": "Triage", "starter": true,
        "cost": { "type": "exact", "val": 4 }, "target": "single_ally",
        "description": "Heal an ally for 6 HP. Clears poison.",
        "effects": { "heal": 6, "cleanse": true }
      },
      {
        "id": "emergency_draught", "name": "Emergency Draught",
        "cost": { "type": "threshold", "min": 5 }, "target": "single_ally",
        "description": "Heal an ally for 9 HP.",
        "effects": { "heal": 9 }
      },
      {
        "id": "plague_flask", "name": "Plague Flask",
        "cost": { "type": "range", "min": 4, "max": 5 }, "target": "all_enemies",
        "description": "Apply 2 Poison to all enemies.",
        "effects": { "poisonAll": 2 }
      },
      {
        "id": "sawbones_choice", "name": "Sawbones' Choice",
        "cost": { "type": "exact", "val": 1 }, "target": "single_ally",
        "description": "Sacrifice 4 HP to heal ally for 8 HP.",
        "effects": { "heal": 8, "selfDamage": 4 }
      },
      {
        "id": "field_surgery", "name": "Field Surgery",
        "cost": { "type": "combined", "min": 6, "dice": 2 }, "target": "all_allies",
        "description": "2 dice totaling 6+. Heal all allies for 4 HP.",
        "effects": { "healAll": 4 }
      },
      {
        "id": "venom_strike", "name": "Venom Strike",
        "cost": { "type": "combined", "min": 5, "dice": 2 }, "target": "single_enemy",
        "description": "2 dice totaling 5+. Deals 4 damage and applies 4 Poison.",
        "effects": { "damage": 4, "poison": 4 }
      }
    ]
  }
};
