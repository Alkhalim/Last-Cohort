// ============================================================
// Last Cohort – Event Data
// Edit this file to add/modify narrative events.
// ============================================================

const RAW_EVENTS = [
  {
    "id": "roman_mile_marker",
    "name": "Roman Mile Marker",
    "maxDifficulty": 1,
    "intro": "A Roman milestone stands at a crossroads, half-buried in moss. The inscription reads 'LEGIO XVII — 3 miles to forward camp.' The forward camp is long gone, but the road is still Roman stone beneath the mud. Your men take comfort in it.",
    "choices": [
      { "text": "Follow the old Roman road.", "outcomes": [
        { "weight": 0.5, "text": "The road holds. Solid footing and clear sightlines. Your men march with purpose.", "effects": { "morale": 12, "healAll": 3 } },
        { "weight": 0.3, "text": "The road leads to an abandoned supply cache, still sealed.", "effects": { "morale": 8, "grantItem": "raider_shield" } },
        { "weight": 0.2, "text": "The road ends abruptly at a collapsed bridge. You lose time backtracking.", "effects": { "morale": -5 } }
      ]},
      { "text": "Search around the milestone for anything useful.", "outcomes": [
        { "weight": 0.5, "text": "Buried at the base, a legionary's kit — still wrapped in oilcloth.", "effects": { "grantItem": "herb_pouch", "morale": 5 } },
        { "weight": 0.3, "text": "Nothing but old bones and rust. The men grow quiet.", "effects": { "morale": -3 } },
        { "weight": 0.2, "text": "You find a charm tucked into a crack in the stone. Someone left it for the next Roman to pass.", "effects": { "grantItem": "woad_charm", "morale": 8 } }
      ]},
      { "text": "Take a moment to rest by the marker.", "outcomes": [
        { "weight": 0.7, "text": "A brief rest in the shadow of Rome. The men eat, drink, and breathe.", "effects": { "healAll": 8, "morale": 5 } },
        { "weight": 0.3, "text": "The rest does everyone good. For a moment, the forest doesn't feel so hostile.", "effects": { "healAll": 6, "morale": 10 } }
      ]}
    ]
  },
  {
    "id": "the_scouts_warning",
    "name": "The Scout's Warning",
    "minDifficulty": 2,
    "maxDifficulty": 2,
    "intro": "One of your forward scouts returns at a sprint, white-faced. 'Ambush ahead,' he gasps. 'A full war band, dug in across the trail. They haven't seen us yet.' You have moments to decide.",
    "choices": [
      { "text": "Prepare your men for a head-on fight.", "outcomes": [
        { "weight": 0.5, "text": "Your men brace shields and ready weapons. The preparation steadies their nerves.", "effects": { "morale": 8, "grantBlock": 6, "buffDamage": 1, "buffAttacks": 2 } },
        { "weight": 0.5, "text": "Forewarned is forearmed. Your men dig in and fortify.", "effects": { "morale": 6, "grantBlock": 8 } }
      ]},
      { "text": "Your scout leads you on a hidden path around them.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "The scout's keen eyes find a deer trail through the thicket. You bypass the ambush entirely.", "effects": { "morale": 15 } },
        { "weight": 0.4, "text": "The detour reveals an abandoned hunter's camp with useful supplies.", "effects": { "morale": 10, "grantItem": "fang_necklace" } }
      ]},
      { "text": "Set your own ambush — turn the tables.", "outcomes": [
        { "weight": 0.4, "text": "The element of surprise works both ways. You strike first and scatter them before they can organize. Spoils litter the trail.", "effects": { "morale": 18, "grantItem": "iron_gladius" } },
        { "weight": 0.3, "text": "Your counter-ambush succeeds, but not without cost. A few scrapes and bruises.", "effects": { "morale": 12, "damageAll": 3 } },
        { "weight": 0.3, "text": "They spot you setting up. The ambush becomes a chaotic brawl.", "effects": { "damageAll": 6, "morale": -5 } }
      ]},
      { "text": "Fall back and find another route.", "outcomes": [
        { "weight": 0.6, "text": "Discretion wins. You lose time but keep everyone safe.", "effects": { "morale": -3 } },
        { "weight": 0.4, "text": "The long way around saps your energy, but you find a stream to rest by.", "effects": { "healAll": 5, "morale": -5 } }
      ]}
    ]
  },
  {
    "id": "roadside_shrine", "name": "Roadside Shrine",
    "intro": "You come upon a weathered shrine to some forgotten god. Offerings of fruit and bone litter the base. The men look to you for guidance.",
    "choices": [
      { "text": "Leave an offering and pray.", "outcomes": [
        { "weight": 0.5, "text": "A warm light fills the glade. The men feel blessed — their weapons gleam.", "effects": { "healAll": 5, "morale": 8, "buffDamage": 2, "buffAttacks": 3 } },
        { "weight": 0.3, "text": "Nothing happens. The gods are silent.", "effects": {} },
        { "weight": 0.2, "text": "A cold wind sweeps through. Poisoned thorns lash from the crumbling shrine.", "effects": { "morale": -8, "poisonParty": 2 } }
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
      { "text": "Have your medicus tend to his wounds.", "requiresClass": "medicus", "outcomes": [
        { "weight": 0.6, "text": "Your medicus works quickly. He dies in your arms, but the satchel holds useful supplies.", "effects": { "grantItem": "herb_pouch", "morale": -5 } },
        { "weight": 0.4, "text": "Your medicus stabilizes him. He whispers a warning about the path ahead. The satchel holds medicine.", "effects": { "healAll": 8, "morale": 8 } }
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
      { "text": "Your scout finds a safe crossing upstream.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Sharp eyes spot a shallow ford hidden by reeds. Everyone crosses dry.", "effects": { "morale": 10 } },
        { "weight": 0.4, "text": "The scout finds the ford and a forgotten supply pack on the far bank.", "effects": { "morale": 8, "grantItem": "scouts_sling" } }
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
      { "text": "Your centurion takes command of the interrogation.", "requiresClass": "centurion", "outcomes": [
        { "weight": 0.6, "text": "Under firm questioning, the scout reveals enemy positions. Your men prepare accordingly.", "effects": { "morale": 12, "grantBlock": 5, "extraDiceNext": 1 } },
        { "weight": 0.4, "text": "The centurion's authority breaks him. He begs for mercy and offers his blade.", "effects": { "grantItem": "wolf_fang_blade", "morale": 5 } }
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
        { "weight": 0.6, "text": "A good haul. The men eat well tonight.", "effects": { "healAll": 6, "morale": 10 } },
        { "weight": 0.4, "text": "You find excellent supplies and a fine weapon among the cache.", "effects": { "healAll": 4, "grantItem": "iron_gladius" } }
      ]},
      { "text": "Take only the medicine and leave the rest.", "outcomes": [
        { "weight": 0.7, "text": "The herbs are potent. Focusing on medicine pays off — your wounded recover well.", "effects": { "healAll": 16 } },
        { "weight": 0.3, "text": "Among the herbs you find something special.", "effects": { "healAll": 12, "grantItem": "herb_pouch" } }
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
      { "text": "Your centurion rallies them with authority.", "requiresClass": "centurion", "outcomes": [
        { "weight": 0.7, "text": "The centurion's voice carries the weight of Rome. Every man falls in line without a word. Morale soars.", "effects": { "morale": 22 } },
        { "weight": 0.3, "text": "They recognize the rank and share their fortified position. Your men rest and sharpen blades.", "effects": { "morale": 12, "healAll": 6, "buffDamage": 1, "buffAttacks": 4, "grantBlock": 3 } }
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
        { "weight": 0.4, "text": "The fire catches fast. The power of the tree seeps into your men as it burns. They feel tougher.", "effects": { "morale": 5, "maxHpAll": 1 } },
        { "weight": 0.3, "text": "The fire reveals a hidden cache at the roots.", "effects": { "grantItem": "runic_stone", "morale": 5 } },
        { "weight": 0.3, "text": "The smoke draws attention. Poison lingers in the air.", "effects": { "morale": -12, "poisonParty": 3 } }
      ]}
    ]
  },
  {
    "id": "trading_post",
    "name": "Trading Post",
    "type": "item_trade",
    "minDifficulty": 2,
    "weight": 2,
    "intro": "A weathered trader has set up camp at a crossroads, surrounded by salvaged wares. He eyes your equipment with interest. Trade something for a better piece of the same kind."
  },
  {
    "id": "training_ground",
    "name": "Training Ground",
    "type": "skill_upgrade",
    "minDifficulty": 3,
    "weight": 2,
    "intro": "You find a clearing where fallen trees form a natural arena. Your men could use this to hone their techniques. One soldier can push a skill beyond its limits."
  },
  {
    "id": "wandering_smith",
    "name": "Wandering Smith",
    "type": "item_upgrade",
    "minDifficulty": 3,
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
      { "text": "Your fighters bring it down cleanly.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.7, "text": "A single precise thrust. The boar never stood a chance. Fresh meat and a trophy tusk.", "effects": { "healAll": 10, "morale": 10 } },
        { "weight": 0.3, "text": "The legionary pins it expertly. The tusk makes a fine blade.", "effects": { "healAll": 8, "grantItem": "fang_necklace" } }
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
      { "text": "Your officer organizes a defensive rest.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "The watchtower provides cover. Your men rest and fortify their defenses.", "effects": { "healAll": 8, "morale": 10, "grantBlock": 6 } },
        { "weight": 0.4, "text": "A well-organized camp. The officer finds a Roman cache bricked into the wall.", "effects": { "healAll": 8, "morale": 8, "grantItem": "shieldbearers_grip" } }
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
      { "text": "Your medicus studies the herbs and symbols.", "requiresClass": "medicus", "outcomes": [
        { "weight": 0.5, "text": "Your medicus recognizes the herbs and brews a powerful stimulant. Your men feel sharper.", "effects": { "healAll": 8, "morale": 5, "extraDiceNext": 2 } },
        { "weight": 0.3, "text": "The medicus deciphers a ward against poison and applies it to your weapons.", "effects": { "morale": 8, "grantItem": "viper_venom_vial" } },
        { "weight": 0.2, "text": "Deep study reveals the ritual's purpose — a protection charm, repurposed.", "effects": { "healAll": 6, "grantItem": "woad_charm" } }
      ]},
      { "text": "Study the symbols carefully.", "outcomes": [
        { "weight": 0.5, "text": "The symbols are hard to read. You glean a little knowledge.", "effects": { "healAll": 5 } },
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
      { "text": "Have your medicus tend to it.", "requiresClass": "medicus", "outcomes": [
        { "weight": 0.4, "text": "Against all odds, the wolf accepts treatment. It limps away, turning back once. Your men feel... something.", "effects": { "morale": 20 } },
        { "weight": 0.3, "text": "It snaps and bites before fleeing. Worth the try.", "effects": { "damageAll": 3, "morale": 5 } },
        { "weight": 0.3, "text": "The wolf calms. Around its neck is a collar with a strange charm.", "effects": { "grantItem": "fang_necklace", "morale": 10 } }
      ]},
      { "text": "Walk past. It's not your problem.", "outcomes": [
        { "weight": 1.0, "text": "The wolf watches you go. The forest is full of suffering.", "effects": {} }
      ]}
    ]
  },
  {
    "id": "shattered_camp",
    "name": "The Shattered Camp",
    "minDifficulty": 2,
    "intro": "A Roman camp lies in ruins \u2014 tents shredded, cookfire cold, equipment scattered in the mud. Signs of a fight everywhere, but no bodies. Drag marks lead into the treeline. Whatever happened here, it happened fast.",
    "choices": [
      { "text": "Search the camp for supplies.", "outcomes": [
        { "weight": 0.4, "text": "Among the wreckage you find intact supplies. Someone packed in a hurry and left these behind.", "effects": { "healAll": 6, "grantItem": "herb_pouch" } },
        { "weight": 0.3, "text": "A weapon rack still stands. One blade is worth taking.", "effects": { "grantItem": "iron_gladius", "morale": -5 } },
        { "weight": 0.3, "text": "The camp is picked clean. Only blood and silence remain.", "effects": { "morale": -10 } }
      ]},
      { "text": "Your officer rallies the men and secures the perimeter.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Discipline holds. The officer turns fear into focus. The camp yields useful supplies.", "effects": { "morale": 10, "healAll": 6, "grantItem": "raider_shield" } },
        { "weight": 0.4, "text": "The perimeter holds. Your men take what they can and move on with purpose.", "effects": { "morale": 12, "healAll": 4 } }
      ]},
      { "text": "Follow the drag marks.", "outcomes": [
        { "weight": 0.4, "text": "The trail leads to a shallow grave. Among the dead, a fine weapon.", "effects": { "grantItem": "chiefs_spear", "morale": -8 } },
        { "weight": 0.3, "text": "You find nothing but torn earth and claw marks. Poisonous fungi line the drag trail.", "effects": { "morale": -10, "poisonParty": 2 } },
        { "weight": 0.3, "text": "The trail ends at a ravine. Below, supplies that tumbled during the retreat.", "effects": { "healAll": 8, "morale": -3 } }
      ]},
      { "text": "Leave. This place is death.", "outcomes": [
        { "weight": 1.0, "text": "You march past. No one looks back.", "effects": { "morale": -5 } }
      ]}
    ]
  },
  {
    "id": "bone_markers",
    "name": "The Bone Markers",
    "minDifficulty": 3,
    "intro": "The trail narrows between trees hung with bone totems \u2014 femurs lashed into symbols, skulls on stakes facing your path. Dark runes are smeared in blood on every surface. Someone knows you're coming.",
    "choices": [
      { "text": "Tear them down and push through.", "outcomes": [
        { "weight": 0.5, "text": "Your men smash the totems with grim satisfaction. The oppressive air lifts.", "effects": { "morale": 12 } },
        { "weight": 0.3, "text": "As the last totem falls, a curse lashes out. Pain sears through the column.", "effects": { "damageAll": 5, "morale": -8 } },
        { "weight": 0.2, "text": "Among the shattered bones, a charm pulses with stolen power.", "effects": { "grantItem": "woad_charm", "morale": 5 } }
      ]},
      { "text": "Your medicus examines the runes and bones.", "requiresClass": "medicus", "outcomes": [
        { "weight": 0.5, "text": "The medicus identifies the poison on the bone tips and prepares a counter-agent. Knowledge is armor.", "effects": { "healAll": 6, "morale": 8 } },
        { "weight": 0.3, "text": "Careful study reveals a ward pattern. Your medicus repurposes it as protection.", "effects": { "morale": 10, "grantItem": "seers_eye" } },
        { "weight": 0.2, "text": "The runes resist understanding, but the medicus brews a tonic from the ritual herbs. Everyone feels tougher.", "effects": { "maxHpAll": 1, "healAll": 3 } }
      ]},
      { "text": "Your fighters carve a new path around them.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.6, "text": "Brute force wins. Your soldiers hack through the undergrowth, avoiding the markers entirely.", "effects": { "morale": 8, "damageAll": 2 } },
        { "weight": 0.4, "text": "The detour takes time but keeps the men away from the markers. They find a stream to refill waterskins.", "effects": { "healAll": 5, "morale": 5 } }
      ]},
      { "text": "Walk through without touching anything.", "outcomes": [
        { "weight": 0.5, "text": "The skulls watch you pass. The men hold their breath the entire way.", "effects": { "morale": -10 } },
        { "weight": 0.5, "text": "You pass through unharmed, but the feeling of being watched doesn't fade.", "effects": { "morale": -6 } }
      ]}
    ]
  },
  {
    "id": "fog_bank",
    "name": "The Fog Bank",
    "intro": "A wall of fog rolls through the trees, thick as wool and cold as the grave. Shapes move in the murk \u2014 or maybe they don't. Your men freeze. Visibility drops to nothing.",
    "choices": [
      { "text": "Push through quickly.", "outcomes": [
        { "weight": 0.4, "text": "You burst through the far side, gasping but intact. The sun breaks through.", "effects": { "healAll": 4, "morale": 5 } },
        { "weight": 0.3, "text": "Branches and bogs batter the column. Men stumble and curse in the dark.", "effects": { "damageAll": 6, "morale": -8 } },
        { "weight": 0.3, "text": "Minor scrapes, but you made it through.", "effects": { "damageAll": 4 } }
      ]},
      { "text": "Your scout guides the way through.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Sharp eyes find the path through the murk. Everyone crosses safely.", "effects": { "morale": 12 } },
        { "weight": 0.4, "text": "The scout finds the path \u2014 and something glinting in the mud.", "effects": { "morale": 8, "grantItem": "fang_necklace" } }
      ]},
      { "text": "Your medicus prepares torches and salves.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "The torches cut through the fog. Your medicus treats the chill before it sets in.", "effects": { "healAll": 8, "morale": 5 } },
        { "weight": 0.4, "text": "The warmth steadies nerves. Your men march through with purpose.", "effects": { "healAll": 6, "morale": 8 } }
      ]},
      { "text": "Wait for it to pass.", "outcomes": [
        { "weight": 0.5, "text": "Hours crawl by. The men grow restless, but the fog lifts.", "effects": { "morale": -3 } },
        { "weight": 0.5, "text": "Something finds you in the fog. Claws and teeth in the dark.", "effects": { "damageAll": 3, "morale": -8 } }
      ]}
    ]
  },
  {
    "id": "hanging_grove",
    "name": "The Hanging Grove",
    "minDifficulty": 4,
    "intro": "The trees ahead are heavy with a grim harvest. Roman soldiers \u2014 your countrymen \u2014 hang from ropes, stripped of armor. A warning from Arminius. Some of your men turn away. Others stare.",
    "choices": [
      { "text": "Cut them down and bury them.", "outcomes": [
        { "weight": 0.6, "text": "Your men work in silence. When it's done, they stand a little taller. Dignity in death.", "effects": { "morale": 18 } },
        { "weight": 0.4, "text": "The ropes were trapped. Poisoned thorns slash your hands as you cut.", "effects": { "damageAll": 3, "morale": -10 } }
      ]},
      { "text": "Search the bodies for equipment.", "outcomes": [
        { "weight": 0.5, "text": "A gladius, still sharp. The dead have no need of it.", "effects": { "grantItem": "iron_gladius", "morale": -12 } },
        { "weight": 0.3, "text": "A wolf pelt cloak, stiff with frost. It'll keep someone warm.", "effects": { "grantItem": "wolf_pelt", "morale": -8 } },
        { "weight": 0.2, "text": "Nothing but rot. The men stare at you with hollow eyes.", "effects": { "morale": -20 } }
      ]},
      { "text": "Your centurion leads funeral rites.", "requiresClass": "centurion", "outcomes": [
        { "weight": 0.7, "text": "The centurion speaks the words of Rome. Every man stands at attention. For a moment, the forest is silent.", "effects": { "morale": 22, "healAll": 5 } },
        { "weight": 0.3, "text": "The rites bring cold fury. Your men swear vengeance. Blades are sharpened.", "effects": { "morale": 15, "buffDamage": 3, "buffAttacks": 2 } }
      ]},
      { "text": "March past in silence.", "outcomes": [
        { "weight": 1.0, "text": "No one speaks. The forest swallows the dead behind you.", "effects": { "morale": -5 } }
      ]}
    ]
  }
];
