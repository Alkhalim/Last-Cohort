// ============================================================
// Last Cohort – Event Data
// Edit this file to add/modify narrative events.
// ============================================================

const RAW_EVENTS = [
  {
    "id": "roadside_shrine", "name": "Roadside Shrine",
    "intro": "You come upon a weathered shrine to some forgotten god. Offerings of fruit and bone litter the base. The men look to you for guidance.",
    "choices": [
      { "text": "Leave an offering and pray.", "outcomes": [
        { "weight": 0.5, "text": "A warm light fills the glade. The men feel renewed.", "effects": { "healAll": 8, "morale": 10 } },
        { "weight": 0.3, "text": "Nothing happens. The gods are silent.", "effects": {} },
        { "weight": 0.2, "text": "A cold wind sweeps through. The shrine crumbles. An ill omen.", "effects": { "morale": -10 } }
      ]},
      { "text": "Smash the shrine and take the offerings.", "outcomes": [
        { "weight": 0.4, "text": "You find a charm hidden among the bones.", "effects": { "grantItem": "woad_charm" } },
        { "weight": 0.3, "text": "The men cheer at the defiance, but the forest seems to darken.", "effects": { "morale": 5 } },
        { "weight": 0.3, "text": "A trap! Poisoned thorns cut your hands.", "effects": { "damageAll": 5, "morale": -5 } }
      ]},
      { "text": "Pass by without stopping.", "outcomes": [
        { "weight": 1.0, "text": "You march on. The shrine watches in silence.", "effects": {} }
      ]}
    ]
  },
  {
    "id": "fallen_legionary", "name": "Fallen Legionary",
    "intro": "A Roman soldier lies against a tree, barely alive. His armor is shattered and his eyes are dim. He clutches a leather satchel.",
    "choices": [
      { "text": "Tend to his wounds and take the satchel.", "outcomes": [
        { "weight": 0.6, "text": "He dies in your arms, but the satchel holds useful supplies.", "effects": { "grantItem": "herb_pouch", "morale": -5 } },
        { "weight": 0.4, "text": "He revives briefly and whispers a warning about the path ahead. The satchel holds medicine.", "effects": { "healAll": 6, "morale": 5 } }
      ]},
      { "text": "Take his equipment and move on.", "outcomes": [
        { "weight": 0.5, "text": "His gladius is still sharp.", "effects": { "grantItem": "iron_gladius" } },
        { "weight": 0.5, "text": "Nothing of value remains. The men grow quiet.", "effects": { "morale": -8 } }
      ]}
    ]
  },
  {
    "id": "river_crossing", "name": "River Crossing",
    "intro": "A swollen river blocks your path. The current is fast and the water dark. Upstream, a narrow fallen log offers a precarious bridge.",
    "choices": [
      { "text": "Ford the river directly.", "outcomes": [
        { "weight": 0.4, "text": "You push through the freezing water. Everyone makes it, barely.", "effects": { "damageAll": 4, "morale": -5 } },
        { "weight": 0.3, "text": "The crossing goes smoothly. The cold water numbs old wounds.", "effects": { "healAll": 3 } },
        { "weight": 0.3, "text": "The current is stronger than expected. Equipment is lost.", "effects": { "damageAll": 6, "morale": -10 } }
      ]},
      { "text": "Cross on the fallen log.", "outcomes": [
        { "weight": 0.5, "text": "Careful footing gets everyone across safely.", "effects": { "morale": 5 } },
        { "weight": 0.3, "text": "The log holds. You find a cache on the far bank.", "effects": { "grantItem": "fang_necklace" } },
        { "weight": 0.2, "text": "The log snaps! Several soldiers tumble into the rapids.", "effects": { "damageAll": 8, "morale": -8 } }
      ]}
    ]
  },
  {
    "id": "captured_scout", "name": "Captured Scout",
    "intro": "Your men drag a struggling Germanic scout from the bushes. He spits and snarls but is clearly terrified.",
    "choices": [
      { "text": "Interrogate him for information.", "outcomes": [
        { "weight": 0.5, "text": "He reveals a hidden supply cache before escaping.", "effects": { "grantItem": "herb_pouch", "morale": 5 } },
        { "weight": 0.3, "text": "He tells you nothing useful and manages to bite a soldier.", "effects": { "damageAll": 2 } },
        { "weight": 0.2, "text": "He breaks free and screams an alarm. You must move quickly.", "effects": { "morale": -12 } }
      ]},
      { "text": "Release him as a show of mercy.", "outcomes": [
        { "weight": 0.6, "text": "The men question your judgment, but the gesture feels right.", "effects": { "morale": 8 } },
        { "weight": 0.4, "text": "He returns later with friends. You were foolish.", "effects": { "morale": -15 } }
      ]}
    ]
  },
  {
    "id": "foragers_cache", "name": "Forager's Cache",
    "intro": "Behind a fallen oak, you discover a hidden cache of supplies \u2014 likely left by a Germanic foraging party. Dried meat, herbs, and a few weapons.",
    "choices": [
      { "text": "Take everything.", "outcomes": [
        { "weight": 0.6, "text": "A good haul. The men eat well tonight.", "effects": { "healAll": 10, "morale": 8 } },
        { "weight": 0.4, "text": "You find excellent supplies and a fine weapon among the cache.", "effects": { "healAll": 6, "grantItem": "iron_gladius" } }
      ]},
      { "text": "Take only the medicine and leave the rest.", "outcomes": [
        { "weight": 0.7, "text": "The herbs are potent. Your wounded recover.", "effects": { "healAll": 12 } },
        { "weight": 0.3, "text": "Among the herbs you find something special.", "effects": { "healAll": 8, "grantItem": "bone_needle_kit" } }
      ]},
      { "text": "Leave it \u2014 it could be a trap.", "outcomes": [
        { "weight": 0.5, "text": "Prudent. The men grumble but respect your caution.", "effects": { "morale": -3 } },
        { "weight": 0.5, "text": "As you leave, you hear a tripwire snap behind you. Good instincts.", "effects": { "morale": 10 } }
      ]}
    ]
  },
  {
    "id": "deserter_camp", "name": "Deserter Camp",
    "intro": "You stumble upon a makeshift camp. Roman equipment is scattered about, but the soldiers here have abandoned their colors. They eye you warily, hands on weapons.",
    "choices": [
      { "text": "Demand they rejoin the column.", "outcomes": [
        { "weight": 0.4, "text": "They fall in line, ashamed. Your men stand a little taller.", "effects": { "morale": 15 } },
        { "weight": 0.3, "text": "They refuse and flee into the forest, but leave useful supplies behind.", "effects": { "healAll": 6, "grantItem": "iron_gladius" } },
        { "weight": 0.3, "text": "They attack in desperation. You put them down, but the fight costs you.", "effects": { "damageAll": 5, "morale": -10 } }
      ]},
      { "text": "Trade supplies with them.", "outcomes": [
        { "weight": 0.6, "text": "They share medicine and a warm meal. A brief taste of civilization.", "effects": { "healAll": 10, "morale": 5 } },
        { "weight": 0.4, "text": "They trade you a curious trinket for your last rations.", "effects": { "grantItem": "woad_charm", "damageAll": 3 } }
      ]},
      { "text": "Leave them. You have enough problems.", "outcomes": [
        { "weight": 1.0, "text": "You slip past. The deserters watch you go in silence.", "effects": {} }
      ]}
    ]
  },
  {
    "id": "ancient_oak", "name": "The Ancient Oak",
    "intro": "A colossal oak tree dominates a clearing, its trunk carved with faces that seem to shift in the firelight. Offerings hang from its branches \u2014 weapons, bones, and Roman standards.",
    "choices": [
      { "text": "Take back the Roman standards.", "outcomes": [
        { "weight": 0.5, "text": "Your men cheer. The standards still carry weight, even here.", "effects": { "morale": 20 } },
        { "weight": 0.3, "text": "As you pull the last standard free, the tree groans. Something watches.", "effects": { "morale": 10, "damageAll": 3 } },
        { "weight": 0.2, "text": "The offerings were trapped. Poison thorns slice your hands.", "effects": { "damageAll": 6, "morale": -5 } }
      ]},
      { "text": "Search the offerings for useful equipment.", "outcomes": [
        { "weight": 0.5, "text": "Among the bones you find a weapon, still sharp.", "effects": { "grantItem": "chiefs_spear" } },
        { "weight": 0.3, "text": "You find herbs wrapped in leather. Good medicine.", "effects": { "healAll": 8, "grantItem": "herb_pouch" } },
        { "weight": 0.2, "text": "Nothing but rot and bone. The men grow uneasy.", "effects": { "morale": -8 } }
      ]},
      { "text": "Burn the tree.", "outcomes": [
        { "weight": 0.4, "text": "The fire catches fast. The carved faces scream as they burn. Your men feel a dark satisfaction.", "effects": { "morale": 5 } },
        { "weight": 0.3, "text": "The fire reveals a hidden cache at the roots.", "effects": { "grantItem": "runic_stone", "morale": 5 } },
        { "weight": 0.3, "text": "The smoke draws attention. You hear war horns in the distance.", "effects": { "morale": -12 } }
      ]}
    ]
  },
  {
    "id": "training_ground",
    "name": "Training Ground",
    "type": "skill_upgrade",
    "minDifficulty": 2,
    "weight": 2,
    "intro": "You find a clearing where fallen trees form a natural arena. Your men could use this to hone their techniques. One soldier can push a skill beyond its limits."
  },
  {
    "id": "wandering_smith",
    "name": "Wandering Smith",
    "type": "item_upgrade",
    "minDifficulty": 2,
    "weight": 2,
    "intro": "A grizzled man sits by a makeshift forge, hammering at glowing metal. He was a Roman smith before the ambush. He offers to improve one piece of equipment."
  },

  {
    "id": "roman_gravesite",
    "name": "Roman Gravesite",
    "intro": "Freshly dug graves line the trail, marked with Roman shields. Your men recognize the insignia. Some kneel. Others look away.",
    "choices": [
      { "text": "Pay respects and offer a prayer.", "outcomes": [
        { "weight": 0.6, "text": "The men take heart from honoring their fallen brothers.", "effects": { "morale": 12 } },
        { "weight": 0.4, "text": "The weight of the dead settles on your shoulders.", "effects": { "morale": -5 } }
      ]},
      { "text": "Search the graves for useful equipment.", "outcomes": [
        { "weight": 0.5, "text": "You find a serviceable weapon among the dead.", "effects": { "grantItem": "iron_gladius", "morale": -8 } },
        { "weight": 0.3, "text": "The graves hold nothing. Your men are disgusted.", "effects": { "morale": -15 } },
        { "weight": 0.2, "text": "You find a pouch of herbs and a finely crafted charm.", "effects": { "grantItem": "woad_charm", "healAll": 4 } }
      ]},
      { "text": "March on. The dead cannot help us.", "outcomes": [
        { "weight": 1.0, "text": "You leave the dead behind. The living need you more.", "effects": {} }
      ]}
    ]
  },
  {
    "id": "boar_in_the_path",
    "name": "Boar in the Path",
    "intro": "A massive wild boar blocks the narrow trail, snorting and pawing the ground. It looks wounded and angry. Your men grip their weapons.",
    "choices": [
      { "text": "Kill the boar for meat.", "outcomes": [
        { "weight": 0.6, "text": "The boar falls. Fresh meat lifts the men's spirits.", "effects": { "healAll": 8, "morale": 8 } },
        { "weight": 0.4, "text": "The boar gores a soldier before going down. Meat is meat.", "effects": { "damageAll": 4, "healAll": 6, "morale": 3 } }
      ]},
      { "text": "Wait for it to move.", "outcomes": [
        { "weight": 0.5, "text": "It eventually wanders off. Time lost, but no blood spilled.", "effects": { "morale": -3 } },
        { "weight": 0.5, "text": "It charges! Your men scatter but regroup quickly.", "effects": { "damageAll": 3 } }
      ]}
    ]
  },
  {
    "id": "abandoned_watchtower",
    "name": "Abandoned Watchtower",
    "minDifficulty": 2,
    "intro": "A crumbling Roman watchtower rises from the canopy. It was overrun long ago, but the stonework still stands. Your men could use it.",
    "choices": [
      { "text": "Climb and scout the area ahead.", "outcomes": [
        { "weight": 0.5, "text": "From the top, you see the path ahead clearly. Your confidence grows.", "effects": { "morale": 15 } },
        { "weight": 0.3, "text": "You spot an enemy patrol and avoid them. The men feel relieved.", "effects": { "morale": 10, "healAll": 3 } },
        { "weight": 0.2, "text": "The stairs collapse. A soldier is injured in the fall.", "effects": { "damageAll": 5, "morale": -5 } }
      ]},
      { "text": "Search the ruins for supplies.", "outcomes": [
        { "weight": 0.5, "text": "You find a cache of Roman equipment hidden in the walls.", "effects": { "grantItem": "raider_shield" } },
        { "weight": 0.3, "text": "Nothing but dust and bones.", "effects": { "morale": -3 } },
        { "weight": 0.2, "text": "A runic stone is embedded in the foundation. It hums with power.", "effects": { "grantItem": "runic_stone" } }
      ]}
    ]
  },
  {
    "id": "blood_ritual",
    "name": "Blood Ritual",
    "minDifficulty": 3,
    "intro": "You stumble upon a clearing where Germanic priests have recently performed a ritual. The ground is soaked in blood. Strange symbols are carved into the trees. Power lingers here.",
    "choices": [
      { "text": "Desecrate the ritual site.", "outcomes": [
        { "weight": 0.4, "text": "The symbols crack and fade. Whatever was bound here dissipates. Your men feel lighter.", "effects": { "morale": 18, "healAll": 5 } },
        { "weight": 0.3, "text": "The blood ignites as you approach. A curse lashes out.", "effects": { "damageAll": 6, "morale": -12 } },
        { "weight": 0.3, "text": "You destroy the site but find a powerful artifact beneath the altar.", "effects": { "grantItem": "arm_ring_of_arminius", "damageAll": 4 } }
      ]},
      { "text": "Study the symbols carefully.", "outcomes": [
        { "weight": 0.5, "text": "Your medicus recognizes some of the herbs used. Knowledge is power.", "effects": { "healAll": 8 } },
        { "weight": 0.3, "text": "The symbols make no sense, but staring at them too long brings headaches.", "effects": { "morale": -8 } },
        { "weight": 0.2, "text": "You decipher a ward against poison. Useful.", "effects": { "morale": 5, "healAll": 3 } }
      ]},
      { "text": "Leave immediately. This place is cursed.", "outcomes": [
        { "weight": 0.7, "text": "Wise. The forest seems to exhale as you leave.", "effects": { "morale": 5 } },
        { "weight": 0.3, "text": "As you turn to leave, something follows. The air grows cold.", "effects": { "morale": -10 } }
      ]}
    ]
  },
  {
    "id": "wounded_wolf",
    "name": "Wounded Beast",
    "minDifficulty": 4,
    "intro": "A massive wolf lies by the trail, a Germanic spear through its flank. It whimpers, eyes wild with pain. It could be a threat or... something else.",
    "choices": [
      { "text": "Put it out of its misery.", "outcomes": [
        { "weight": 0.5, "text": "The wolf dies quietly. Its pelt is thick and warm.", "effects": { "grantItem": "wolf_pelt", "morale": 3 } },
        { "weight": 0.5, "text": "As it dies, others howl in the distance. Its pack remembers.", "effects": { "morale": -8 } }
      ]},
      { "text": "Have the medicus tend to it.", "outcomes": [
        { "weight": 0.4, "text": "Against all odds, the wolf accepts treatment. It limps away, turning back once. Your men feel... something.", "effects": { "morale": 20 } },
        { "weight": 0.3, "text": "It snaps and bites before fleeing. Worth the try.", "effects": { "damageAll": 3, "morale": 5 } },
        { "weight": 0.3, "text": "The wolf calms. Around its neck is a collar with a strange charm.", "effects": { "grantItem": "fang_necklace", "morale": 10 } }
      ]},
      { "text": "Walk past. It's not your problem.", "outcomes": [
        { "weight": 1.0, "text": "The wolf watches you go. The forest is full of suffering.", "effects": {} }
      ]}
    ]
  }
];
