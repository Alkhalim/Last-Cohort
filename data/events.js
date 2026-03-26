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
        { "weight": 0.5, "text": "The road holds. Solid footing and clear sightlines. Your men march with purpose.", "effects": { "morale": 6, "healAll": 3 } },
        { "weight": 0.3, "text": "The road leads to an abandoned supply cache, still sealed.", "effects": { "morale": 4, "grantItem": "raider_shield" } },
        { "weight": 0.2, "text": "The road ends abruptly at a collapsed bridge. You lose time backtracking.", "effects": { "morale": -3 } }
      ]},
      { "text": "Search around the milestone for anything useful.", "outcomes": [
        { "weight": 0.5, "text": "Buried at the base, a legionary's kit — still wrapped in oilcloth.", "effects": { "grantItem": "herb_pouch", "morale": 3 } },
        { "weight": 0.3, "text": "Nothing but old bones and rust. The men grow quiet.", "effects": { "morale": -2 } },
        { "weight": 0.2, "text": "You find a charm tucked into a crack in the stone. Someone left it for the next Roman to pass.", "effects": { "grantItem": "woad_charm", "morale": 4 } }
      ]},
      { "text": "Take a moment to rest by the marker.", "outcomes": [
        { "weight": 0.7, "text": "A brief rest in the shadow of Rome. The men eat, drink, and breathe.", "effects": { "healAll": 8, "morale": 3 } },
        { "weight": 0.3, "text": "The rest does everyone good. For a moment, the forest doesn't feel so hostile.", "effects": { "healAll": 6, "morale": 5 } }
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
        { "weight": 0.5, "text": "Your men brace shields and ready weapons. The preparation steadies their nerves.", "effects": { "morale": 4, "grantBlock": 6, "buffDamage": 1, "buffAttacks": 2 } },
        { "weight": 0.5, "text": "Forewarned is forearmed. Your men dig in and fortify.", "effects": { "morale": 3, "grantBlock": 8 } }
      ]},
      { "text": "Your scout leads you on a hidden path around them.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "The scout's keen eyes find a deer trail through the thicket. You bypass the ambush entirely.", "effects": { "morale": 8 } },
        { "weight": 0.4, "text": "The detour reveals an abandoned hunter's camp with useful supplies.", "effects": { "morale": 5, "grantItem": "fang_necklace" } }
      ]},
      { "text": "Set your own ambush — turn the tables.", "outcomes": [
        { "weight": 0.4, "text": "The element of surprise works both ways. You strike first and scatter them before they can organize. Spoils litter the trail.", "effects": { "morale": 9, "grantItem": "iron_gladius" } },
        { "weight": 0.3, "text": "Your counter-ambush succeeds, but not without cost. A few scrapes and bruises.", "effects": { "morale": 6, "damageAll": 3 } },
        { "weight": 0.3, "text": "They spot you setting up. The ambush becomes a chaotic brawl.", "effects": { "damageAll": 6, "morale": -3 } }
      ]},
      { "text": "Fall back and find another route.", "outcomes": [
        { "weight": 0.6, "text": "Discretion wins. You lose time but keep everyone safe.", "effects": { "morale": -2 } },
        { "weight": 0.4, "text": "The long way around saps your energy, but you find a stream to rest by.", "effects": { "healAll": 5, "morale": -3 } }
      ]}
    ]
  },
  {
    "id": "roadside_shrine", "name": "Roadside Shrine",
    "intro": "You come upon a weathered shrine to some forgotten god. Offerings of fruit and bone litter the base. The men look to you for guidance.",
    "choices": [
      { "text": "Leave an offering and pray.", "outcomes": [
        { "weight": 0.5, "text": "A warm light fills the glade. The men feel blessed — their weapons gleam.", "effects": { "healAll": 5, "morale": 4, "buffDamage": 2, "buffAttacks": 3 } },
        { "weight": 0.3, "text": "Nothing happens. The gods are silent.", "effects": {} },
        { "weight": 0.2, "text": "A cold wind sweeps through. Poisoned thorns lash from the crumbling shrine.", "effects": { "morale": -4, "poisonParty": 2 } }
      ]},
      { "text": "Smash the shrine and take the offerings.", "outcomes": [
        { "weight": 0.4, "text": "You find a charm hidden among the bones.", "effects": { "grantItem": "woad_charm" } },
        { "weight": 0.3, "text": "The men cheer at the defiance, but the forest seems to darken.", "effects": { "morale": 3 } },
        { "weight": 0.3, "text": "A trap! Poisoned thorns cut your hands.", "effects": { "damageAll": 5, "morale": -3 } }
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
      { "text": "Have your healer tend to his wounds.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "Your healer works quickly. He dies in your arms, but the satchel holds useful supplies.", "effects": { "grantItem": "herb_pouch", "morale": -3 } },
        { "weight": 0.4, "text": "Your healer stabilizes him. He whispers a warning about the path ahead. The satchel holds medicine.", "effects": { "healAll": 8, "morale": 4 } }
      ]},
      { "text": "Take his equipment and move on.", "outcomes": [
        { "weight": 0.5, "text": "His gladius is still sharp.", "effects": { "grantItem": "iron_gladius" } },
        { "weight": 0.5, "text": "Nothing of value remains. The men grow quiet.", "effects": { "morale": -4 } }
      ]}
    ]
  },
  {
    "id": "river_crossing", "name": "River Crossing",
    "intro": "A swollen river blocks your path. The current is fast and the water dark. Upstream, a narrow fallen log offers a precarious bridge.",
    "choices": [
      { "text": "Ford the river directly.", "outcomes": [
        { "weight": 0.4, "text": "You push through the freezing water. Everyone makes it, barely.", "effects": { "damageAll": 4, "morale": -3 } },
        { "weight": 0.3, "text": "The crossing goes smoothly. The cold water numbs old wounds.", "effects": { "healAll": 3 } },
        { "weight": 0.3, "text": "The current is stronger than expected. Equipment is lost.", "effects": { "damageAll": 6, "morale": -5 } }
      ]},
      { "text": "Your scout finds a safe crossing upstream.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Sharp eyes spot a shallow ford hidden by reeds. Everyone crosses dry.", "effects": { "morale": 5 } },
        { "weight": 0.4, "text": "The scout finds the ford and a forgotten supply pack on the far bank.", "effects": { "morale": 4, "grantItem": "scouts_sling" } }
      ]},
      { "text": "Cross on the fallen log.", "outcomes": [
        { "weight": 0.5, "text": "Careful footing gets everyone across safely.", "effects": { "morale": 3 } },
        { "weight": 0.3, "text": "The log holds. You find a cache on the far bank.", "effects": { "grantItem": "fang_necklace" } },
        { "weight": 0.2, "text": "The log snaps! Several soldiers tumble into the rapids.", "effects": { "damageAll": 8, "morale": -4 } }
      ]}
    ]
  },
  {
    "id": "captured_scout", "name": "Captured Scout",
    "intro": "Your men drag a struggling Germanic scout from the bushes. He spits and snarls but is clearly terrified.",
    "choices": [
      { "text": "Interrogate him for information.", "outcomes": [
        { "weight": 0.5, "text": "He reveals a hidden supply cache before escaping.", "effects": { "grantItem": "herb_pouch", "morale": 3 } },
        { "weight": 0.3, "text": "He tells you nothing useful and manages to bite a soldier.", "effects": { "damageAll": 2 } },
        { "weight": 0.2, "text": "He breaks free and screams an alarm. You must move quickly.", "effects": { "morale": -6 } }
      ]},
      { "text": "Your officer takes command of the interrogation.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Under firm questioning, the scout reveals enemy positions. Your men prepare accordingly.", "effects": { "morale": 6, "grantBlock": 5, "extraDiceNext": 1 } },
        { "weight": 0.4, "text": "The officer's authority breaks him. He begs for mercy and offers his blade.", "effects": { "grantItem": "wolf_fang_blade", "morale": 3 } }
      ]},
      { "text": "Release him as a show of mercy.", "outcomes": [
        { "weight": 0.6, "text": "The men question your judgment, but the gesture feels right.", "effects": { "morale": 4 } },
        { "weight": 0.4, "text": "He returns later with friends. You were foolish.", "effects": { "morale": -8 } }
      ]}
    ]
  },
  {
    "id": "foragers_cache", "name": "Forager's Cache",
    "intro": "Behind a fallen oak, you discover a hidden cache of supplies \u2014 likely left by a Germanic foraging party. Dried meat, herbs, and a few weapons.",
    "choices": [
      { "text": "Take everything.", "outcomes": [
        { "weight": 0.6, "text": "A good haul. The men eat well tonight.", "effects": { "healAll": 6, "morale": 5 } },
        { "weight": 0.4, "text": "You find excellent supplies and a fine weapon among the cache.", "effects": { "healAll": 4, "grantItem": "iron_gladius" } }
      ]},
      { "text": "Take only the medicine and leave the rest.", "outcomes": [
        { "weight": 0.7, "text": "The herbs are potent. Focusing on medicine pays off — your wounded recover well.", "effects": { "healAll": 16 } },
        { "weight": 0.3, "text": "Among the herbs you find something special.", "effects": { "healAll": 12, "grantItem": "herb_pouch" } }
      ]},
      { "text": "Leave it \u2014 it could be a trap.", "outcomes": [
        { "weight": 0.5, "text": "Prudent. The men grumble but respect your caution.", "effects": { "morale": -2 } },
        { "weight": 0.5, "text": "As you leave, you hear a tripwire snap behind you. Good instincts.", "effects": { "morale": 5 } }
      ]}
    ]
  },
  {
    "id": "deserter_camp", "name": "Deserter Camp",
    "intro": "You stumble upon a makeshift camp. Roman equipment is scattered about, but the soldiers here have abandoned their colors. They eye you warily, hands on weapons.",
    "choices": [
      { "text": "Demand they rejoin the column.", "outcomes": [
        { "weight": 0.4, "text": "They fall in line, ashamed. Your men stand a little taller.", "effects": { "morale": 8 } },
        { "weight": 0.3, "text": "They refuse and flee into the forest, but leave useful supplies behind.", "effects": { "healAll": 6, "grantItem": "iron_gladius" } },
        { "weight": 0.3, "text": "They attack in desperation. You put them down, but the fight costs you.", "effects": { "damageAll": 5, "morale": -5 } }
      ]},
      { "text": "Your officer rallies them with authority.", "requiresTag": "command", "outcomes": [
        { "weight": 0.7, "text": "Your officer's voice carries the weight of Rome. Every man falls in line without a word. Morale soars.", "effects": { "morale": 11 } },
        { "weight": 0.3, "text": "They recognize the rank and share their fortified position. Your men rest and sharpen blades.", "effects": { "morale": 6, "healAll": 6, "buffDamage": 1, "buffAttacks": 4, "grantBlock": 3 } }
      ]},
      { "text": "Trade supplies with them.", "outcomes": [
        { "weight": 0.6, "text": "They share medicine and a warm meal. A brief taste of civilization.", "effects": { "healAll": 10, "morale": 3 } },
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
        { "weight": 0.5, "text": "Your men cheer. The standards still carry weight, even here.", "effects": { "morale": 10 } },
        { "weight": 0.3, "text": "As you pull the last standard free, the tree groans. Something watches.", "effects": { "morale": 5, "damageAll": 3 } },
        { "weight": 0.2, "text": "The offerings were trapped. Poison thorns slice your hands.", "effects": { "damageAll": 6, "morale": -3 } }
      ]},
      { "text": "Search the offerings for useful equipment.", "outcomes": [
        { "weight": 0.5, "text": "Among the bones you find a weapon, still sharp.", "effects": { "grantItem": "chiefs_spear" } },
        { "weight": 0.3, "text": "You find herbs wrapped in leather. Good medicine.", "effects": { "healAll": 8, "grantItem": "herb_pouch" } },
        { "weight": 0.2, "text": "Nothing but rot and bone. The men grow uneasy.", "effects": { "morale": -4 } }
      ]},
      { "text": "Burn the tree.", "outcomes": [
        { "weight": 0.4, "text": "The fire catches fast. The power of the tree seeps into your men as it burns. They feel tougher.", "effects": { "morale": 3, "maxHpAll": 1 } },
        { "weight": 0.3, "text": "The fire reveals a hidden cache at the roots.", "effects": { "grantItem": "runic_stone", "morale": 3 } },
        { "weight": 0.3, "text": "The smoke draws attention. Poison lingers in the air.", "effects": { "morale": -6, "poisonParty": 3 } }
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
        { "weight": 0.6, "text": "The men take heart from honoring their fallen brothers.", "effects": { "morale": 6 } },
        { "weight": 0.4, "text": "The weight of the dead settles on your shoulders.", "effects": { "morale": -3 } }
      ]},
      { "text": "Search the graves for useful equipment.", "outcomes": [
        { "weight": 0.5, "text": "You find a serviceable weapon among the dead.", "effects": { "grantItem": "iron_gladius", "morale": -4 } },
        { "weight": 0.3, "text": "The graves hold nothing. Your men are disgusted.", "effects": { "morale": -8 } },
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
        { "weight": 0.6, "text": "The boar falls. Fresh meat lifts the men's spirits.", "effects": { "healAll": 8, "morale": 4 } },
        { "weight": 0.4, "text": "The boar gores a soldier before going down. Meat is meat.", "effects": { "damageAll": 4, "healAll": 6, "morale": 2 } }
      ]},
      { "text": "Your fighters bring it down cleanly.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.7, "text": "A single precise thrust. The boar never stood a chance. Fresh meat and a trophy tusk.", "effects": { "healAll": 10, "morale": 5 } },
        { "weight": 0.3, "text": "The legionary pins it expertly. The tusk makes a fine blade.", "effects": { "healAll": 8, "grantItem": "fang_necklace" } }
      ]},
      { "text": "Wait for it to move.", "outcomes": [
        { "weight": 0.5, "text": "It eventually wanders off. Time lost, but no blood spilled.", "effects": { "morale": -2 } },
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
        { "weight": 0.5, "text": "From the top, you see the path ahead clearly. Your confidence grows.", "effects": { "morale": 8 } },
        { "weight": 0.3, "text": "You spot an enemy patrol and avoid them. The men feel relieved.", "effects": { "morale": 5, "healAll": 3 } },
        { "weight": 0.2, "text": "The stairs collapse. A soldier is injured in the fall.", "effects": { "damageAll": 5, "morale": -3 } }
      ]},
      { "text": "Your officer organizes a defensive rest.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "The watchtower provides cover. Your men rest and fortify their defenses.", "effects": { "healAll": 8, "morale": 5, "grantBlock": 6 } },
        { "weight": 0.4, "text": "A well-organized camp. The officer finds a Roman cache bricked into the wall.", "effects": { "healAll": 8, "morale": 4, "grantItem": "shieldbearers_grip" } }
      ]},
      { "text": "Search the ruins for supplies.", "outcomes": [
        { "weight": 0.5, "text": "You find a cache of Roman equipment hidden in the walls.", "effects": { "grantItem": "raider_shield" } },
        { "weight": 0.3, "text": "Nothing but dust and bones.", "effects": { "morale": -2 } },
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
        { "weight": 0.4, "text": "The symbols crack and fade. Whatever was bound here dissipates. Your men feel lighter.", "effects": { "morale": 9, "healAll": 5 } },
        { "weight": 0.3, "text": "The blood ignites as you approach. A curse lashes out.", "effects": { "damageAll": 6, "morale": -6 } },
        { "weight": 0.3, "text": "You destroy the site but find a powerful artifact beneath the altar.", "effects": { "grantItem": "arm_ring_of_arminius", "damageAll": 4 } }
      ]},
      { "text": "Your healer studies the herbs and symbols.", "requiresTag": "support", "outcomes": [
        { "weight": 0.5, "text": "Your healer recognizes the herbs and brews a powerful stimulant. Your men feel sharper.", "effects": { "healAll": 8, "morale": 3, "extraDiceNext": 2 } },
        { "weight": 0.3, "text": "The healer deciphers a ward against poison and applies it to your weapons.", "effects": { "morale": 4, "grantItem": "viper_venom_vial" } },
        { "weight": 0.2, "text": "Deep study reveals the ritual's purpose — a protection charm, repurposed.", "effects": { "healAll": 6, "grantItem": "woad_charm" } }
      ]},
      { "text": "Study the symbols carefully.", "outcomes": [
        { "weight": 0.5, "text": "The symbols are hard to read. You glean a little knowledge.", "effects": { "healAll": 5 } },
        { "weight": 0.3, "text": "The symbols make no sense, but staring at them too long brings headaches.", "effects": { "morale": -4 } },
        { "weight": 0.2, "text": "You decipher a ward against poison. Useful.", "effects": { "morale": 3, "healAll": 3 } }
      ]},
      { "text": "Leave immediately. This place is cursed.", "outcomes": [
        { "weight": 0.7, "text": "Wise. The forest seems to exhale as you leave.", "effects": { "morale": 3 } },
        { "weight": 0.3, "text": "As you turn to leave, something follows. The air grows cold.", "effects": { "morale": -5 } }
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
        { "weight": 0.5, "text": "The wolf dies quietly. Its pelt is thick and warm.", "effects": { "grantItem": "wolf_pelt", "morale": 2 } },
        { "weight": 0.5, "text": "As it dies, others howl in the distance. Its pack remembers.", "effects": { "morale": -4 } }
      ]},
      { "text": "Have your healer tend to it.", "requiresTag": "support", "outcomes": [
        { "weight": 0.4, "text": "Against all odds, the wolf accepts treatment. It limps away, turning back once. Your men feel... something.", "effects": { "morale": 10 } },
        { "weight": 0.3, "text": "It snaps and bites before fleeing. Worth the try.", "effects": { "damageAll": 3, "morale": 3 } },
        { "weight": 0.3, "text": "The wolf calms. Around its neck is a collar with a strange charm.", "effects": { "grantItem": "fang_necklace", "morale": 5 } }
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
        { "weight": 0.3, "text": "A weapon rack still stands. One blade is worth taking.", "effects": { "grantItem": "iron_gladius", "morale": -3 } },
        { "weight": 0.3, "text": "The camp is picked clean. Only blood and silence remain.", "effects": { "morale": -5 } }
      ]},
      { "text": "Your officer rallies the men and secures the perimeter.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Discipline holds. The officer turns fear into focus. The camp yields useful supplies.", "effects": { "morale": 5, "healAll": 6, "grantItem": "raider_shield" } },
        { "weight": 0.4, "text": "The perimeter holds. Your men take what they can and move on with purpose.", "effects": { "morale": 6, "healAll": 4 } }
      ]},
      { "text": "Follow the drag marks.", "outcomes": [
        { "weight": 0.4, "text": "The trail leads to a shallow grave. Among the dead, a fine weapon.", "effects": { "grantItem": "chiefs_spear", "morale": -4 } },
        { "weight": 0.3, "text": "You find nothing but torn earth and claw marks. Poisonous fungi line the drag trail.", "effects": { "morale": -5, "poisonParty": 2 } },
        { "weight": 0.3, "text": "The trail ends at a ravine. Below, supplies that tumbled during the retreat.", "effects": { "healAll": 8, "morale": -2 } }
      ]},
      { "text": "Leave. This place is death.", "outcomes": [
        { "weight": 1.0, "text": "You march past. No one looks back.", "effects": { "morale": -3 } }
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
        { "weight": 0.5, "text": "Your men smash the totems with grim satisfaction. The oppressive air lifts.", "effects": { "morale": 6 } },
        { "weight": 0.3, "text": "As the last totem falls, a curse lashes out. Pain sears through the column.", "effects": { "damageAll": 5, "morale": -4 } },
        { "weight": 0.2, "text": "Among the shattered bones, a charm pulses with stolen power.", "effects": { "grantItem": "woad_charm", "morale": 3 } }
      ]},
      { "text": "Your healer examines the runes and bones.", "requiresTag": "support", "outcomes": [
        { "weight": 0.5, "text": "Your healer identifies the poison on the bone tips and prepares a counter-agent. Knowledge is armor.", "effects": { "healAll": 6, "morale": 4 } },
        { "weight": 0.3, "text": "Careful study reveals a ward pattern. Your healer repurposes it as protection.", "effects": { "morale": 5, "grantItem": "seers_eye" } },
        { "weight": 0.2, "text": "The runes resist understanding, but your healer brews a tonic from the ritual herbs. Everyone feels tougher.", "effects": { "maxHpAll": 1, "healAll": 3 } }
      ]},
      { "text": "Your fighters carve a new path around them.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.6, "text": "Brute force wins. Your soldiers hack through the undergrowth, avoiding the markers entirely.", "effects": { "morale": 4, "damageAll": 2 } },
        { "weight": 0.4, "text": "The detour takes time but keeps the men away from the markers. They find a stream to refill waterskins.", "effects": { "healAll": 5, "morale": 3 } }
      ]},
      { "text": "Walk through without touching anything.", "outcomes": [
        { "weight": 0.5, "text": "The skulls watch you pass. The men hold their breath the entire way.", "effects": { "morale": -5 } },
        { "weight": 0.5, "text": "You pass through unharmed, but the feeling of being watched doesn't fade.", "effects": { "morale": -3 } }
      ]}
    ]
  },
  {
    "id": "fog_bank",
    "name": "The Fog Bank",
    "intro": "A wall of fog rolls through the trees, thick as wool and cold as the grave. Shapes move in the murk \u2014 or maybe they don't. Your men freeze. Visibility drops to nothing.",
    "choices": [
      { "text": "Push through quickly.", "outcomes": [
        { "weight": 0.4, "text": "You burst through the far side, gasping but intact. The sun breaks through.", "effects": { "healAll": 4, "morale": 3 } },
        { "weight": 0.3, "text": "Branches and bogs batter the column. Men stumble and curse in the dark.", "effects": { "damageAll": 6, "morale": -4 } },
        { "weight": 0.3, "text": "Minor scrapes, but you made it through.", "effects": { "damageAll": 4 } }
      ]},
      { "text": "Your scout guides the way through.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Sharp eyes find the path through the murk. Everyone crosses safely.", "effects": { "morale": 6 } },
        { "weight": 0.4, "text": "The scout finds the path \u2014 and something glinting in the mud.", "effects": { "morale": 4, "grantItem": "fang_necklace" } }
      ]},
      { "text": "Your medicus prepares torches and salves.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "The torches cut through the fog. Your medicus treats the chill before it sets in.", "effects": { "healAll": 8, "morale": 3 } },
        { "weight": 0.4, "text": "The warmth steadies nerves. Your men march through with purpose.", "effects": { "healAll": 6, "morale": 4 } }
      ]},
      { "text": "Wait for it to pass.", "outcomes": [
        { "weight": 0.5, "text": "Hours crawl by. The men grow restless, but the fog lifts.", "effects": { "morale": -2 } },
        { "weight": 0.5, "text": "Something finds you in the fog. Claws and teeth in the dark.", "effects": { "damageAll": 3, "morale": -4 } }
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
        { "weight": 0.6, "text": "Your men work in silence. When it's done, they stand a little taller. Dignity in death.", "effects": { "morale": 9 } },
        { "weight": 0.4, "text": "The ropes were trapped. Poisoned thorns slash your hands as you cut.", "effects": { "damageAll": 3, "morale": -5 } }
      ]},
      { "text": "Search the bodies for equipment.", "outcomes": [
        { "weight": 0.5, "text": "A gladius, still sharp. The dead have no need of it.", "effects": { "grantItem": "iron_gladius", "morale": -6 } },
        { "weight": 0.3, "text": "A wolf pelt cloak, stiff with frost. It'll keep someone warm.", "effects": { "grantItem": "wolf_pelt", "morale": -4 } },
        { "weight": 0.2, "text": "Nothing but rot. The men stare at you with hollow eyes.", "effects": { "morale": -10 } }
      ]},
      { "text": "Your officer leads funeral rites.", "requiresTag": "command", "outcomes": [
        { "weight": 0.7, "text": "Your officer speaks the words of Rome. Every man stands at attention. For a moment, the forest is silent.", "effects": { "morale": 11, "healAll": 5 } },
        { "weight": 0.3, "text": "The rites bring cold fury. Your men swear vengeance. Blades are sharpened.", "effects": { "morale": 8, "buffDamage": 3, "buffAttacks": 2 } }
      ]},
      { "text": "March past in silence.", "outcomes": [
        { "weight": 1.0, "text": "No one speaks. The forest swallows the dead behind you.", "effects": { "morale": -3 } }
      ]}
    ]
  },
  // === MARCH 1 — THE AMBUSH TRAIL ===
  {
    "id": "the_broken_cart",
    "name": "The Broken Cart",
    "maxDifficulty": 1,
    "weight": 2,
    "intro": "A Roman supply cart lies overturned on the trail, its oxen long gone. Crates are scattered. Some are smashed, but others look intact. Claw marks score the wood — something dragged the driver away.",
    "choices": [
      { "text": "Salvage what you can.", "outcomes": [
        { "weight": 0.5, "text": "Medical supplies and dried rations. Your men eat well for the first time in days.", "effects": { "healAll": 6, "morale": 4 } },
        { "weight": 0.3, "text": "A sealed weapon crate. Roman steel, sharp and ready.", "effects": { "grantItem": "iron_gladius", "morale": 3 } },
        { "weight": 0.2, "text": "Most of it is ruined. But at the bottom, something valuable.", "effects": { "grantItem": "herb_pouch", "morale": 2 } }
      ]},
      { "text": "Your fighters set up a defensive perimeter.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.6, "text": "Smart move. Wolves were circling. Your fighters drive them off and claim the supplies unmolested.", "effects": { "healAll": 5, "grantDamage": { "amount": 1, "tag": "melee", "count": 1 }, "morale": 5 } },
        { "weight": 0.4, "text": "The perimeter holds. In the wreckage, your fighters find a fine shield — battered but serviceable.", "effects": { "grantItem": "raider_shield", "grantBlock": { "amount": 1, "tag": "melee", "count": 1 }, "morale": 4 } }
      ]},
      { "text": "It's bait. Move on.", "outcomes": [
        { "weight": 1.0, "text": "Your caution is rewarded. You spot wolf tracks converging on the cart. Better to march hungry than not march at all.", "effects": { "morale": 3 } }
      ]}
    ]
  },

  // === MARCH 2 — THE HUNTING GROUNDS ===
  {
    "id": "the_hunters_blind",
    "name": "The Hunter's Blind",
    "minDifficulty": 2, "maxDifficulty": 2,
    "weight": 2,
    "intro": "High in the canopy, a hunter's platform. Rope ladders dangle from the branches. Someone watched this trail from above — recently, judging by the fresh-cut wood. They left in a hurry.",
    "choices": [
      { "text": "Climb up and use the vantage point.", "outcomes": [
        { "weight": 0.5, "text": "From above, you see the trail ahead clearly. Ambush positions marked with stones. Forewarned is forearmed.", "effects": { "morale": 6, "extraDiceNext": 1 } },
        { "weight": 0.5, "text": "The hunter left supplies — arrows, a waterskin, and a carved map of the area.", "effects": { "grantItem": "spotters_lens", "morale": 4 } }
      ]},
      { "text": "Your marksman studies the kill marks on the platform.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Hundreds of tallies. This hunter was prolific. Your marksman learns from the positioning — better angles, better timing.", "effects": { "grantDamage": { "amount": 1, "tag": "ranged", "count": 1 }, "grantMaxHp": { "amount": 1, "tag": "ranged", "count": 1 }, "morale": 4 } },
        { "weight": 0.4, "text": "Hidden beneath a loose plank — a quiver of specially crafted arrows. Your marksman's eyes light up.", "effects": { "grantItem": "huntsmans_arrow", "morale": 5 } }
      ]},
      { "text": "Cut the ropes. Deny it to the enemy.", "outcomes": [
        { "weight": 1.0, "text": "The platform crashes down. No one will watch this trail again. Your men feel a small victory.", "effects": { "morale": 4 } }
      ]}
    ]
  },

  // === MARCH 3 — THE WARCAMP ===
  {
    "id": "the_abandoned_armory",
    "name": "The Abandoned Armory",
    "minDifficulty": 3, "maxDifficulty": 3,
    "weight": 2,
    "intro": "You find a Germanic armory — racks of weapons, stacks of shields, a still-warm forge. The warriors fled when they heard your column. Everything here is crude but effective.",
    "choices": [
      { "text": "Arm up. Take everything.", "outcomes": [
        { "weight": 0.5, "text": "Your soldiers grab weapons, shields, and armor scraps. Not Roman quality, but the extra iron helps.", "effects": { "grantDamage": { "amount": 1, "count": 2 }, "grantBlock": { "amount": 1, "count": 2 }, "morale": 4 } },
        { "weight": 0.5, "text": "Among the crude weapons, one stands out — clearly taken from a Roman officer.", "effects": { "grantItem": "chiefs_spear", "morale": 5 } }
      ]},
      { "text": "Your officer organizes a proper inventory.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Roman efficiency at its finest. Everything useful is catalogued and distributed. Nothing wasted.", "effects": { "grantDamage": { "amount": 1, "count": 3 }, "grantBlock": { "amount": 1, "count": 3 }, "morale": 6 } },
        { "weight": 0.4, "text": "Your officer finds a hidden compartment — Germanic war plans and a fine blade. Knowledge and steel.", "effects": { "grantItem": "wolf_fang_blade", "extraDiceNext": 2, "morale": 5 } }
      ]},
      { "text": "Burn it. Deny them resupply.", "outcomes": [
        { "weight": 0.7, "text": "The armory goes up in flames. Smoke rises. The enemy will feel this loss.", "effects": { "morale": 8 } },
        { "weight": 0.3, "text": "As it burns, the heat cracks a hidden cache in the wall. You pull out a Roman helmet — stolen, now reclaimed.", "effects": { "grantItem": "fortified_helm", "morale": 6 } }
      ]}
    ]
  },

  // === MARCH 4 — THE POISONED BOG ===
  {
    "id": "the_drowned_legionary",
    "name": "The Drowned Legionary",
    "minDifficulty": 4, "maxDifficulty": 4,
    "weight": 2,
    "intro": "Half-submerged in the black water, a Roman legionary. Not dead — not alive either. His eyes flutter open as you approach. 'Kill me,' he whispers through cracked lips. 'Or save me. But don't leave me here.'",
    "choices": [
      { "text": "Pull him out and tend to him.", "outcomes": [
        { "weight": 0.4, "text": "Your men drag him from the muck. He's delirious but alive. As he recovers, he whispers about the bog — where to step, where not to. The knowledge saves lives.", "effects": { "healAll": 4, "morale": 6, "grantMaxHp": { "amount": 1, "count": 3 } } },
        { "weight": 0.3, "text": "He clutches a sealed pouch to his chest. 'Take it,' he gasps. 'I carried it from the massacre.' Inside — a vial of potent antivenom and a legionary's charm.", "effects": { "grantItem": "woad_charm", "morale": 5, "healAll": 5 } },
        { "weight": 0.3, "text": "He doesn't make it. But his last words are coordinates — a cache he buried before the bog took him.", "effects": { "morale": -3, "grantItem": "venomous_blade" } }
      ]},
      { "text": "Your healer tries to purge the bog-poison.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "Against all odds, your healer stabilizes him. He weeps with gratitude and tells you everything — poison paths, safe water, where the plague bearers nest. Your healer learns from the bog-toxins.", "effects": { "morale": 8, "grantHeal": { "amount": 1, "tag": "support", "count": 1 }, "grantPoison": { "amount": 1, "tag": "support", "count": 1 }, "healAll": 3 } },
        { "weight": 0.4, "text": "The poison is like nothing your healer has seen. She extracts a sample — it will coat blades beautifully. The legionary passes peacefully.", "effects": { "grantPoison": { "amount": 1, "count": 2 }, "grantItem": "bitter_remedy", "morale": 4 } }
      ]},
      { "text": "Grant him a soldier's mercy.", "outcomes": [
        { "weight": 1.0, "text": "A quick thrust. His eyes clear for one moment — gratitude — then nothing. You take his equipment. It's still good.", "effects": { "morale": 3, "grantDamage": { "amount": 1, "count": 1 }, "grantBlock": { "amount": 1, "count": 1 } } }
      ]}
    ]
  },

  {
    "id": "grave_of_ariovistus",
    "name": "The Barrow of Ariovistus",
    "minDifficulty": 3,
    "maxDifficulty": 3,
    "oncePerRun": true,
    "weight": 1,
    "intro": "Deep in the forest, your men stumble upon a mound of ancient stone half-swallowed by roots. Runes older than Rome are carved into the entrance. The air is cold and still. Your scouts recognize the markings — this is the barrow of Ariovistus, the great Germanic king who defied Caesar himself. His grave was never found... until now.",
    "choices": [
      { "text": "Break the seal and enter the barrow.", "outcomes": [
        { "weight": 1.0, "text": "The stones groan as the seal shatters. From the darkness, something stirs. The dead king does not rest easy.", "effects": { "triggerCombat": { "enemies": ["revenant_of_ariovistus", "barrow_guardian", "barrow_guardian", "barrow_guardian"], "name": "The Barrow of Ariovistus", "intro": "The Revenant of Ariovistus rises from his throne of bones. His court rises with him.", "loot": ["crown_of_ariovistus", "blade_of_ariovistus"] } } }
      ]},
      { "text": "Pay your respects and take what the grave offers.", "outcomes": [
        { "weight": 0.5, "text": "You kneel at the entrance. The cold wind carries a whisper — and something rolls from the darkness into the light. The dead king's crown.", "effects": { "grantItem": "crown_of_ariovistus", "morale": 5 } },
        { "weight": 0.5, "text": "You kneel at the entrance. A rusted blade slides from the earth at your feet, as if offered. The dead king's weapon.", "effects": { "grantItem": "blade_of_ariovistus", "morale": 5 } }
      ]},
      { "text": "This place is cursed. Leave it undisturbed.", "outcomes": [
        { "weight": 1.0, "text": "Your men breathe easier as you back away. Some things are better left buried. The forest seems to approve.", "effects": { "morale": 8 } }
      ]}
    ]
  },
  {
    "id": "hermits_spring",
    "name": "The Hermit's Spring",
    "minDifficulty": 2,
    "weight": 1,
    "intro": "A natural spring bubbles from the rocks, surrounded by carved stones. An old hermit watches from a cave, neither hostile nor friendly. He gestures to the water.",
    "choices": [
      { "text": "Drink deep and rest.", "outcomes": [
        { "weight": 0.5, "text": "The water is impossibly pure. Whoever drinks it feels stronger than before.", "effects": { "healAll": 6, "grantMaxHp": { "amount": 2, "count": 2 } } },
        { "weight": 0.5, "text": "The spring revitalizes the entire cohort. The hermit nods approvingly.", "effects": { "healAll": 8, "morale": 5 } }
      ]},
      { "text": "Ask the hermit for wisdom.", "outcomes": [
        { "weight": 0.5, "text": "He speaks in riddles, but your scouts learn from his gestures. The forest makes more sense now.", "effects": { "grantDamage": { "amount": 1, "tag": "ranged", "count": 1 }, "morale": 3 } },
        { "weight": 0.5, "text": "He shows your healer herbs growing near the spring. Potent medicine.", "effects": { "grantHeal": { "amount": 1, "tag": "support", "count": 1 }, "morale": 3 } }
      ]},
      { "text": "Move on. You don't trust it.", "outcomes": [
        { "weight": 1.0, "text": "The hermit watches you go. Maybe you'll regret it. Maybe not.", "effects": { "morale": 2 } }
      ]}
    ]
  },
  {
    "id": "abandoned_forge",
    "name": "The Abandoned Forge",
    "minDifficulty": 3,
    "weight": 1,
    "intro": "Smoke still rises from a forge abandoned by fleeing villagers. Tools, ingots, and half-finished weapons lie scattered. Your men could put this to use.",
    "choices": [
      { "text": "Reforge weapons.", "outcomes": [
        { "weight": 0.6, "text": "Your strongest fighters hammer new edges onto their blades. The iron sings.", "effects": { "grantDamage": { "amount": 2, "tag": "melee", "count": 2, "fallbackTag": "any", "fallbackCount": 1 }, "morale": 3 } },
        { "weight": 0.4, "text": "The forge produces a fine blade before the coals die.", "effects": { "grantItem": "iron_gladius", "grantDamage": { "amount": 2, "count": 1 } } }
      ]},
      { "text": "Forge arrowheads and bolts.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "Your ranged fighters tip their projectiles with fresh iron. Sharper, heavier, deadlier.", "effects": { "grantDamage": { "amount": 2, "tag": "ranged", "count": 2 } } },
        { "weight": 0.4, "text": "Enough iron for poison-tipped arrowheads. Nasty work, but effective.", "effects": { "grantPoison": { "amount": 2, "tag": "ranged", "count": 2 }, "grantDamage": { "amount": 1, "tag": "ranged", "count": 1 } } }
      ]},
      { "text": "Mend armor instead.", "outcomes": [
        { "weight": 0.6, "text": "Dents hammered out, straps replaced. Your front line feels hardened.", "effects": { "grantBlock": { "amount": 1, "tag": "melee", "count": 2 }, "grantMaxHp": { "amount": 3, "count": 3 } } },
        { "weight": 0.4, "text": "New rivets, reinforced plate. Your officers' armor gleams.", "effects": { "grantBlock": { "amount": 1, "tag": "command", "count": 2 }, "grantMaxHp": { "amount": 3, "count": 3 } } }
      ]}
    ]
  },
  {
    "id": "poison_grove",
    "name": "The Poison Grove",
    "minDifficulty": 3,
    "weight": 1,
    "intro": "A grove of dark-barked trees drips with a sticky, foul-smelling sap. Your healer recognizes it — deadly nightshade, distilled by the forest itself.",
    "choices": [
      { "text": "Have your healer harvest the sap.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "Your healer carefully extracts the toxin and brews a salve. Blades are coated, wounds are mended.", "effects": { "grantPoison": { "amount": 1, "count": 2 }, "grantHeal": { "amount": 1, "count": 2 } } },
        { "weight": 0.4, "text": "The healer distills a potent concentrate — both remedy and weapon in one. Masterful work.", "effects": { "grantHeal": { "amount": 2, "count": 2 }, "grantPoison": { "amount": 2, "count": 2 } } }
      ]},
      { "text": "Coat everyone's weapons.", "outcomes": [
        { "weight": 0.7, "text": "A thin sheen of poison on every blade. The next fight will be uglier — for them.", "effects": { "grantPoison": { "amount": 1, "count": 2 } } },
        { "weight": 0.3, "text": "Someone gets careless. Poison on the blade, and on the hand.", "effects": { "grantPoison": { "amount": 1, "count": 2 }, "damageAll": 3 } }
      ]},
      { "text": "Avoid it. Poison is a barbarian's tool.", "outcomes": [
        { "weight": 1.0, "text": "Your men respect the decision. Rome fights with iron, not venom.", "effects": { "morale": 4 } }
      ]}
    ]
  },
  {
    "id": "veterans_cache",
    "name": "Veteran's Cache",
    "minDifficulty": 4,
    "weight": 1,
    "intro": "Hidden beneath a fallen tree, you find a Roman cache — left by legionaries who marched this forest before you. Dog tags, a sealed scroll of tactics, and preserved supplies.",
    "choices": [
      { "text": "Study the tactical scroll.", "outcomes": [
        { "weight": 0.5, "text": "The scroll details fighting formations for forest combat. Your officers learn new tricks.", "effects": { "grantDamage": { "amount": 1, "tag": "command", "count": 2 }, "morale": 4 } },
        { "weight": 0.5, "text": "Detailed maps of the area. Your whole cohort benefits from the foreknowledge.", "effects": { "grantMaxHp": { "amount": 1, "count": 3 }, "morale": 5 } }
      ]},
      { "text": "Distribute the supplies.", "outcomes": [
        { "weight": 0.6, "text": "Medical supplies, field rations, whetstone. Everyone gets something useful.", "effects": { "healAll": 6, "grantHeal": { "amount": 1, "tag": "support", "count": 1 }, "grantDamage": { "amount": 1, "tag": "melee", "count": 1 } } },
        { "weight": 0.4, "text": "Among the supplies, a sealed vial of concentrated venom. Precious cargo.", "effects": { "healAll": 4, "grantPoison": { "amount": 2, "count": 1 } } }
      ]},
      { "text": "Read the dog tags aloud. Honor the fallen.", "outcomes": [
        { "weight": 0.6, "text": "Names spoken, memories honored. Every soldier stands a little taller.", "effects": { "morale": 10, "grantMaxHp": { "amount": 1, "count": 3 } } },
        { "weight": 0.4, "text": "Among the tags, a centurion's shield-drill manual. Your front line drills until dawn.", "effects": { "morale": 8, "grantBlock": { "amount": 1, "count": 3 } } }
      ]}
    ]
  },

  // === MARCH 5 — THE OLD FOREST ===
  {
    "id": "the_speaking_tree",
    "name": "The Speaking Tree",
    "minDifficulty": 5, "maxDifficulty": 5,
    "weight": 2,
    "intro": "A gnarled tree older than Rome stands alone in a clearing. Its bark is carved with faces. As you approach, the wind carries what sounds like whispered Latin — impossible, yet unmistakable.",
    "choices": [
      { "text": "Listen to the whispers.", "outcomes": [
        { "weight": 0.5, "text": "The tree speaks of paths ahead — hidden dangers and forgotten treasures. Your men memorize every word.", "effects": { "morale": 5, "grantMaxHp": { "amount": 2, "count": 3 }, "extraDiceNext": 2 } },
        { "weight": 0.3, "text": "The whispers grow louder. One of your soldiers reaches into a hollow and pulls out an ancient weapon, wrapped in roots.", "effects": { "grantItem": "oak_splinter", "morale": 4 } },
        { "weight": 0.2, "text": "The tree screams. Your men stagger. But when silence returns, they feel... hardened.", "effects": { "damageAll": 3, "grantDamage": { "amount": 1, "count": 3 }, "morale": -3 } }
      ]},
      { "text": "Offer blood to the tree.", "outcomes": [
        { "weight": 0.6, "text": "You cut your palm and press it to the bark. The tree shudders — and the forest parts ahead, revealing a safer path.", "effects": { "damageAll": 2, "healAll": 6, "morale": 8 } },
        { "weight": 0.4, "text": "The blood is accepted. Roots shift, revealing a cache of old power.", "effects": { "damageAll": 2, "grantItem": "wicker_ash" } }
      ]},
      { "text": "Your marksman reads the carvings — they're a map.", "requiresTag": "ranged", "outcomes": [
        { "weight": 0.6, "text": "The carvings reveal hidden paths. Your marksman plots a route that avoids every ambush ahead.", "effects": { "morale": 6, "extraDiceNext": 1, "grantDamage": { "amount": 1, "tag": "ranged", "count": 1 } } },
        { "weight": 0.4, "text": "One carving points to a hunter's cache buried nearby. Arrows, traps, and a fine bow.", "effects": { "grantItem": "stormcaller_bow", "morale": 4 } }
      ]},
      { "text": "Burn it. This is sorcery.", "outcomes": [
        { "weight": 1.0, "text": "The tree burns fast and hot. Your men cheer, but the forest remembers.", "effects": { "morale": 4, "grantDamage": { "amount": 1, "tag": "melee", "count": 2 } } }
      ]}
    ]
  },

  // === MARCH 6 — THE BLOOD GROVE ===
  {
    "id": "the_blood_altar",
    "name": "The Blood Altar",
    "minDifficulty": 6, "maxDifficulty": 6,
    "weight": 2,
    "intro": "You find an altar of dark stone, still wet with fresh blood. Ritual daggers and herb bundles surround it. The power here is palpable — dangerous, but potentially useful.",
    "choices": [
      { "text": "Your healer examines the ritual herbs.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "The herbs are potent. Your healer brews a draught that strengthens everyone's resistance to poison and blade alike.", "effects": { "grantHeal": { "amount": 2, "tag": "support", "count": 1 }, "grantMaxHp": { "amount": 2, "count": 3 } } },
        { "weight": 0.4, "text": "A vial of concentrated blood-poison. Terrible, but effective.", "effects": { "grantPoison": { "amount": 2, "count": 1 }, "grantDamage": { "amount": 1, "count": 1 } } }
      ]},
      { "text": "Desecrate the altar.", "outcomes": [
        { "weight": 0.5, "text": "You shatter the stone. Beneath it, Roman coins and a weapon — tribute from previous victims.", "effects": { "grantItem": "blood_iron_gladius", "morale": 5 } },
        { "weight": 0.5, "text": "The altar cracks. Dark energy lashes out, but your front line absorbs it. They feel tougher.", "effects": { "damageAll": 4, "grantBlock": { "amount": 2, "tag": "melee", "count": 2 }, "morale": 3 } }
      ]},
      { "text": "Leave it. You're soldiers, not priests.", "outcomes": [
        { "weight": 1.0, "text": "Your men respect the decision. Rome does not kneel to barbarian gods.", "effects": { "morale": 6 } }
      ]}
    ]
  },

  // === MARCH 7 — THE HAUNTED MARCH (Undead Romans) ===
  {
    "id": "the_hollow_centurion",
    "name": "The Hollow Centurion",
    "minDifficulty": 7, "maxDifficulty": 7,
    "weight": 2,
    "intro": "A Roman centurion stands at a crossroads, motionless. His armor is rusted, his eyes are empty, but he salutes as you approach. He is dead — but something in him remembers duty.",
    "choices": [
      { "text": "Return the salute. Speak the legion's oath.", "outcomes": [
        { "weight": 0.5, "text": "The centurion's lips move. No sound, but you understand: he shows you the safe path. Then he crumbles to dust. Your men stand taller.", "effects": { "morale": 10, "grantBlock": { "amount": 1, "count": 3 }, "grantMaxHp": { "amount": 1, "count": 3 } } },
        { "weight": 0.5, "text": "He offers his vine staff — the centurion's symbol of command. His duty is done. He falls to pieces with something like peace.", "effects": { "grantItem": "vine_staff", "morale": 8, "grantDamage": { "amount": 1, "tag": "command", "count": 1 } } }
      ]},
      { "text": "Put him to rest. He deserves it.", "outcomes": [
        { "weight": 0.6, "text": "You speak the funeral rites. The hollow centurion kneels, then dissolves. The other dead in the area grow still — fewer will rise against you.", "effects": { "morale": 9, "healAll": 5, "grantMaxHp": { "amount": 1, "count": 3 } } },
        { "weight": 0.4, "text": "As you finish the rites, the ground opens. Buried beneath the centurion — his personal effects, preserved by the forest's magic.", "effects": { "grantItem": "commanders_signet", "morale": 6, "grantDamage": { "amount": 1, "count": 2 } } }
      ]},
      { "text": "Your officer takes command of him.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Your officer speaks the centurion's oath. The dead officer straightens, nods, and points the way forward. Then he fades — but the path he showed is clear and safe.", "effects": { "morale": 9, "grantDamage": { "amount": 1, "tag": "command", "count": 1 }, "grantBlock": { "amount": 2, "tag": "command", "count": 1 }, "healAll": 4 } },
        { "weight": 0.4, "text": "The centurion recognizes the authority. He surrenders his command token — a bronze disc etched with the legion's number.", "effects": { "grantItem": "battle_standard_cord", "morale": 8 } }
      ]},
      { "text": "Destroy him. The dead should stay dead.", "outcomes": [
        { "weight": 0.7, "text": "He doesn't resist. Your blade passes through him like mist. But the other dead nearby stir with anger.", "effects": { "morale": -5, "grantDamage": { "amount": 2, "tag": "melee", "count": 1 } } },
        { "weight": 0.3, "text": "He crumbles, but his armor remains — still serviceable after all these years.", "effects": { "grantItem": "champions_helm", "morale": -3 } }
      ]}
    ]
  },

  // === MARCH 7 — Second event ===
  {
    "id": "the_roman_graves",
    "name": "The Roman Graves",
    "minDifficulty": 7, "maxDifficulty": 7,
    "weight": 1,
    "intro": "You find rows of Roman graves — hastily dug, poorly marked. Three legions died here. Some graves are open, the occupants already walking. But a few remain sealed.",
    "choices": [
      { "text": "Seal the open graves with Roman burial rites.", "outcomes": [
        { "weight": 1.0, "text": "Your officer leads the rites. Grave by grave, the dead settle. The forest feels lighter here. Your men fight with renewed purpose.", "effects": { "morale": 10, "grantBlock": { "amount": 1, "count": 3 }, "healAll": 4 } }
      ]},
      { "text": "Search the sealed graves for equipment.", "outcomes": [
        { "weight": 0.6, "text": "Roman weapons, still sharp. Roman armor, still strong. The dead have no use for them anymore.", "effects": { "grantDamage": { "amount": 1, "count": 2 }, "grantBlock": { "amount": 1, "tag": "melee", "count": 2 } } },
        { "weight": 0.4, "text": "Beneath a centurion's grave, a sealed chest. Inside — the legion's pay chest, and a fine blade.", "effects": { "grantItem": "chiefs_spear", "morale": 4 } }
      ]},
      { "text": "March on. You can't help the dead.", "outcomes": [
        { "weight": 1.0, "text": "Some things are best left alone. Your men avert their eyes.", "effects": { "morale": 3 } }
      ]}
    ]
  },

  // === MARCH 8 — THE DROWNED KINGDOM ===
  {
    "id": "the_sunken_shrine",
    "name": "The Sunken Shrine",
    "minDifficulty": 6, "maxDifficulty": 6,
    "weight": 2,
    "intro": "Half-submerged in the swamp, a stone shrine older than any tribe. Water flows from a carved face, crystal clear despite the murk around it. Runes you cannot read line the walls.",
    "choices": [
      { "text": "Drink from the shrine.", "outcomes": [
        { "weight": 0.4, "text": "The water burns, then heals. Ancient power floods through you. Your soldiers gasp — then laugh. They feel invincible.", "effects": { "healAll": 10, "grantMaxHp": { "amount": 3, "count": 2 }, "morale": 5 } },
        { "weight": 0.3, "text": "Visions of the past. You see the kingdom that was, and the weapons they forged. Knowledge becomes power.", "effects": { "grantDamage": { "amount": 1, "count": 3 }, "morale": 4 } },
        { "weight": 0.3, "text": "The water turns black in your hands. Poison seeps in — but also strength.", "effects": { "poisonParty": 3, "grantPoison": { "amount": 2, "count": 2 }, "grantDamage": { "amount": 1, "count": 1 } } }
      ]},
      { "text": "Take the shrine stones. They're valuable.", "outcomes": [
        { "weight": 0.6, "text": "The rune-stones pulse with captured power. Your equipment drinks it in.", "effects": { "grantBlock": { "amount": 2, "count": 2 }, "grantDamage": { "amount": 1, "count": 2 } } },
        { "weight": 0.4, "text": "One stone is different — warm to the touch, humming with old magic.", "effects": { "grantItem": "runic_stone" } }
      ]},
      { "text": "Your fighters dive to explore the sunken chambers.", "requiresTag": "melee", "outcomes": [
        { "weight": 0.5, "text": "Beneath the waterline, sealed vaults. Your fighters pry them open and find ancient arms — heavy, brutal, and perfectly preserved.", "effects": { "grantDamage": { "amount": 2, "tag": "melee", "count": 2 }, "grantBlock": { "amount": 1, "tag": "melee", "count": 2 } } },
        { "weight": 0.5, "text": "A sealed sarcophagus contains a weapon of dark metal. It hums with old power.", "effects": { "grantItem": "mire_mothers_tusk", "morale": 3 } }
      ]},
      { "text": "Pray to whatever god this belongs to.", "outcomes": [
        { "weight": 1.0, "text": "No god answers, but the water rises and cleanses. Poison, pain, and fear wash away.", "effects": { "healAll": 8, "morale": 8 } }
      ]}
    ]
  },

  // === MARCH 9 — THE HEART OF THE FOREST ===
  {
    "id": "the_dryad_mother",
    "name": "The Dryad Mother",
    "minDifficulty": 7, "maxDifficulty": 7,
    "weight": 2,
    "intro": "A figure steps from a tree — not an enemy, but a dryad, ancient and vast. Her bark-skin is covered in flowers. She studies you with amber eyes and speaks in broken Latin: 'You are not the forest's enemy. Not yet.'",
    "choices": [
      { "text": "Ask her for passage.", "outcomes": [
        { "weight": 0.5, "text": "'Passage is earned, not given.' She touches each soldier's forehead. Pain, then clarity. Your bodies harden like heartwood.", "effects": { "grantMaxHp": { "amount": 3, "count": 3 }, "grantBlock": { "amount": 2, "count": 3 }, "morale": 5 } },
        { "weight": 0.5, "text": "'The forest will test you. But I will ease the way.' Roots shift. The path ahead clears. Healing sap drips from the canopy.", "effects": { "healAll": 12, "morale": 8, "grantHeal": { "amount": 2, "tag": "support", "count": 1 } } }
      ]},
      { "text": "Ask her about the spirits ahead.", "outcomes": [
        { "weight": 0.6, "text": "'They are bound. Arminius and Varus — hate holds them. You must break the bond.' She gives you a charm woven from living wood.", "effects": { "grantItem": "heartwood_charm", "morale": 6 } },
        { "weight": 0.4, "text": "'Strike them both at once. The bond heals what you damage apart.' She marks your weapons with sap. They glow faintly.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "morale": 5 } }
      ]},
      { "text": "Your healer offers to trade knowledge.", "requiresTag": "support", "outcomes": [
        { "weight": 0.6, "text": "The dryad is fascinated by Roman medicine. She trades forest remedies — salves that knit bone, sap that purges poison. Your healer is transformed.", "effects": { "grantHeal": { "amount": 3, "tag": "support", "count": 1 }, "grantMaxHp": { "amount": 2, "tag": "support", "count": 1 }, "morale": 5 } },
        { "weight": 0.4, "text": "She gives your healer a living seed. 'Plant this in a wound,' she says. 'It will grow into healing.' The seed pulses with green light.", "effects": { "grantItem": "marsh_fang", "grantHeal": { "amount": 1, "count": 2 }, "morale": 4 } }
      ]},
      { "text": "Attack her. She's part of the forest.", "outcomes": [
        { "weight": 0.7, "text": "She vanishes into the wood before your blade connects. Thorns erupt from every surface. The forest will show no mercy now.", "effects": { "damageAll": 6, "morale": -8 } },
        { "weight": 0.3, "text": "Your blade bites bark. She bleeds golden sap and screams. The sap hardens on your weapons — laced with power and fury.", "effects": { "damageAll": 4, "grantDamage": { "amount": 3, "count": 1 }, "grantPoison": { "amount": 2, "count": 1 }, "morale": -10 } }
      ]}
    ]
  },

  // === MARCH 10 — THE THRESHOLD ===
  {
    "id": "the_last_campfire",
    "name": "The Last Campfire",
    "minDifficulty": 7,
    "weight": 2,
    "intro": "You find a campfire still burning — impossible, since no one lives here. Around it, ghostly impressions of Roman soldiers. Not hostile. Waiting. One gestures for you to sit.",
    "choices": [
      { "text": "Sit and share your fire.", "outcomes": [
        { "weight": 0.5, "text": "The ghosts smile. They share memories of home — wives, children, Rome. When dawn comes, your men are rested and resolute. The final march begins.", "effects": { "healAll": 15, "morale": 13, "grantMaxHp": { "amount": 2, "count": 3 } } },
        { "weight": 0.5, "text": "One ghost offers you his gladius. 'Finish what we couldn't,' he whispers. Then they fade, one by one.", "effects": { "healAll": 10, "morale": 10, "grantDamage": { "amount": 2, "count": 2 } } }
      ]},
      { "text": "Stand watch while your men rest.", "outcomes": [
        { "weight": 1.0, "text": "You guard through the night. The ghosts guard with you. When dawn breaks, every soldier is healed, armored, and ready for the end.", "effects": { "healAll": 12, "morale": 10, "grantBlock": { "amount": 2, "count": 3 }, "grantDamage": { "amount": 1, "count": 3 } } }
      ]},
      { "text": "Your officer rallies them for one last drill.", "requiresTag": "command", "outcomes": [
        { "weight": 0.6, "text": "Living and dead drill together through the night. The ghosts remember their training. When dawn comes, your cohort has absorbed centuries of experience.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "grantBlock": { "amount": 2, "count": 3 }, "morale": 8 } },
        { "weight": 0.4, "text": "The ghost centurion steps forward and salutes your officer. 'You are worthy.' He offers the legion's eagle — broken, but still powerful.", "effects": { "grantItem": "eagle_lost_ninth", "morale": 10 } }
      ]},
      { "text": "This is a trap. Move on.", "outcomes": [
        { "weight": 1.0, "text": "The ghosts watch you go with sad eyes. Maybe it was real. Maybe it wasn't. Your men march on, wary but unbroken.", "effects": { "morale": 5, "grantBlock": { "amount": 1, "count": 3 } } }
      ]}
    ]
  },

  {
    "id": "threshold_voices",
    "name": "Voices Between Worlds",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "The air thickens. Your men hear whispers — not Germanic, not Latin. Something older. The trees here are white as bone, and the ground hums beneath your feet. Between the pale trunks, you see shapes — not ghosts, but memories. Battles that haven't happened yet. Deaths that haven't been chosen.",
    "choices": [
      { "text": "Listen to the voices. Learn what is to come.", "outcomes": [
        { "weight": 0.5, "text": "The whispers show you the spirits' weaknesses — where they falter, where they flinch. Knowledge is the sharpest weapon.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "morale": 5 } },
        { "weight": 0.5, "text": "The voices show you your own deaths. Every possible end. Your men stagger — but those who recover are hardened beyond breaking.", "effects": { "morale": -6, "grantMaxHp": { "amount": 3, "count": 3 }, "grantBlock": { "amount": 2, "count": 3 } } }
      ]},
      { "text": "Silence your minds. March through.", "outcomes": [
        { "weight": 1.0, "text": "You stuff wax in your ears and press on. The voices fade. Your men's resolve holds — barely.", "effects": { "morale": 3 } }
      ]}
    ]
  },

  {
    "id": "threshold_altar",
    "name": "The Broken Altar",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "You find a stone altar split in two — half carved with Roman eagles, half with Germanic runes. Blood, old and new, stains both halves. A sword is wedged in the crack between them. The inscription reads: 'Who mends this altar chooses which world survives.'",
    "choices": [
      { "text": "Mend the Roman half. Rome endures.", "outcomes": [
        { "weight": 1.0, "text": "You press the eagle half together. Light pulses through the stone. Your men feel the weight of Rome behind them — distant, but real.", "effects": { "healAll": 10, "morale": 10 } }
      ]},
      { "text": "Take the sword. Leave both halves broken.", "outcomes": [
        { "weight": 0.6, "text": "The blade slides free — ancient, heavy, thirsty. The altar crumbles. Both worlds tremble.", "effects": { "grantDamage": { "amount": 3, "count": 1 }, "morale": -4 } },
        { "weight": 0.4, "text": "The blade resists — then snaps. A shockwave throws your men back. The altar was not meant to be disturbed.", "effects": { "damageAll": 8, "morale": -5, "grantBlock": { "amount": 4, "count": 3 } } }
      ]},
      { "text": "Pray at the altar. Both halves.", "outcomes": [
        { "weight": 1.0, "text": "You kneel between two worlds and speak to both. The altar hums. Your wounds close. The spirits ahead seem... less certain.", "effects": { "healAll": 8, "morale": 6, "grantDamage": { "amount": 1, "count": 3 } } }
      ]}
    ]
  },

  {
    "id": "threshold_roman_dead",
    "name": "The Roman Dead",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "You stumble upon a clearing filled with Roman dead. Not skeletons — bodies. Fresh, as if they fell yesterday, though the armor is from Varus's time. Their eyes are open. Some of them look like your men. One of them looks like you.",
    "choices": [
      { "text": "Bury them. They deserve that much.", "outcomes": [
        { "weight": 1.0, "text": "Your men dig graves in silence. When the last body is laid to rest, the air lightens. The dead do not stir again.", "effects": { "morale": 12, "healAll": 5 } }
      ]},
      { "text": "Strip them for supplies. The living need it more.", "outcomes": [
        { "weight": 0.6, "text": "You take what you can — bandages, blades, a flask of good wine. Your men won't meet your eyes.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "morale": -6 } },
        { "weight": 0.4, "text": "As the first man reaches for a gladius, the corpse grabs his wrist. They weren't dead. They were waiting.", "effects": { "triggerCombat": { "enemies": ["hollow_legionary", "hollow_legionary", "hollow_centurion", "hollow_equites"], "name": "The Fallen Century", "intro": "The Roman dead rise in perfect formation. They still remember their training." } } }
      ]},
      { "text": "March on. Don't look at their faces.", "outcomes": [
        { "weight": 1.0, "text": "You avert your eyes and press forward. The dead watch you go. You feel their judgment on your back.", "effects": { "morale": 3 } }
      ]}
    ]
  },

  {
    "id": "threshold_mirror_pool",
    "name": "The Mirror Pool",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "A perfectly still pool of black water sits between the bone-white trees. Its surface reflects nothing — not the sky, not the trees, not you. But when you look closely, you see figures moving beneath. Your cohort, marching. Winning. Losing. Dying. Living. Every possible future, playing out in silence.",
    "choices": [
      { "text": "Drink from the pool.", "outcomes": [
        { "weight": 0.5, "text": "The water is ice-cold and tastes of iron. Visions flood your mind — you see the spirits' patterns, their weaknesses. When the visions stop, you are bleeding from the nose but wiser.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "grantBlock": { "amount": 2, "count": 3 }, "damageAll": 5 } },
        { "weight": 0.5, "text": "The water burns. Your men scream. When the pain stops, each soldier's wounds have closed — but something else has opened.", "effects": { "healAll": 15, "morale": -8 } }
      ]},
      { "text": "Shatter the surface with a stone.", "outcomes": [
        { "weight": 1.0, "text": "The stone hits the water and the reflections scatter. For a moment, every future is visible at once. Then nothing. The pool is just water now. Your men feel lighter.", "effects": { "morale": 8 } }
      ]}
    ]
  },

  {
    "id": "threshold_eagle_grove",
    "name": "The Eagle Grove",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "Three aquila standards stand upright in the earth, planted in a circle. The eagle standards of Varus's three lost legions — XVII, XVIII, XIX. They should have been taken by the tribes. They should have rotted. But here they stand, gleaming as if just polished, waiting for Romans to claim them.",
    "choices": [
      { "text": "Raise the standards. Remember who you are.", "outcomes": [
        { "weight": 1.0, "text": "Your men raise the eagles. Light breaks through the canopy for the first time in days. Every soldier stands taller. Rome is not dead. Not yet.", "effects": { "morale": 15, "grantBlock": { "amount": 3, "count": 3 } } }
      ]},
      { "text": "Kneel before them. Swear an oath to carry them home.", "outcomes": [
        { "weight": 1.0, "text": "Every man kneels. The oath is simple: 'We will not fall here.' The eagles seem to pulse with warmth. Your wounds mend. Your fear lifts.", "effects": { "healAll": 10, "morale": 10, "grantDamage": { "amount": 1, "count": 3 } } }
      ]},
      { "text": "Leave them. They belong to the dead now.", "outcomes": [
        { "weight": 1.0, "text": "You turn away. The eagles darken. Perhaps they were always just metal. But your men look haunted.", "effects": { "morale": -3 } }
      ]}
    ]
  },

  {
    "id": "threshold_deserter",
    "name": "The Deserter",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "A Roman soldier sits against a tree, very much alive. His armor is from Varus's time — seventeen years ago. He should be old, or dead. He is neither. 'I ran,' he says simply. 'At Teutoburg. I ran into the forest and I never stopped. The forest wouldn't let me die. It wouldn't let me leave. It just... kept me.' He looks at your cohort. 'You're the first Romans I've seen in seventeen years.'",
    "choices": [
      { "text": "Welcome him. Every sword counts.", "outcomes": [
        { "weight": 0.6, "text": "He weeps. Then he picks up his gladius. He knows these woods better than anyone alive. His knowledge is worth a legion.", "effects": { "grantDamage": { "amount": 2, "count": 1 }, "grantMaxHp": { "amount": 3, "count": 3 }, "morale": 8 } },
        { "weight": 0.4, "text": "He joins your ranks — then at night, you find him talking to the trees. Whatever he is now, it isn't entirely Roman.", "effects": { "grantDamage": { "amount": 3, "count": 1 }, "morale": -4 } }
      ]},
      { "text": "A deserter is a deserter. Leave him.", "outcomes": [
        { "weight": 1.0, "text": "'I understand,' he says. 'Tell Rome I'm sorry.' You march on. Behind you, you hear weeping — then silence.", "effects": { "morale": 4 } }
      ]}
    ]
  },

  {
    "id": "threshold_final_prayer",
    "name": "The Shrine of Mars",
    "minDifficulty": 8, "maxDifficulty": 8,
    "oncePerRun": true,
    "weight": 3,
    "intro": "Carved into a cliff face — unmistakably Roman work — a shrine to Mars, god of war. It should not exist this deep in Germanic territory. Candles burn at its base, impossibly. An inscription reads: 'Mars Ultor — the Avenger. Leave your fear here. Take only iron.'",
    "choices": [
      { "text": "Pray for strength.", "outcomes": [
        { "weight": 1.0, "text": "Your men kneel. The shrine flares with light. When they rise, their hands are steady and their eyes are hard. Whatever comes next, they are ready.", "effects": { "grantDamage": { "amount": 2, "count": 3 }, "morale": 8 } }
      ]},
      { "text": "Pray for protection.", "outcomes": [
        { "weight": 1.0, "text": "The candlelight wraps around your men like armor. The stone seems to breathe. Mars guards his own.", "effects": { "grantBlock": { "amount": 3, "count": 3 }, "healAll": 8, "morale": 5 } }
      ]},
      { "text": "Leave your fear. Take nothing.", "outcomes": [
        { "weight": 1.0, "text": "Each man touches the stone and whispers something private. Fear drains from them like water from a cracked vessel. They march on, empty of doubt.", "effects": { "morale": 15 } }
      ]}
    ]
  },

  {
    "id": "dragons_lair",
    "name": "The Dragon's Lair",
    "minDifficulty": 7, "maxDifficulty": 7,
    "oncePerRun": true,
    "weight": 1,
    "intro": "Your scouts return pale-faced. They found a cave mouth in the hillside, half-hidden by ancient roots. The stone around it is scorched black. From deep within comes a sound like a forge bellows — rhythmic, immense. The air tastes of sulfur. Bones litter the entrance — human, animal, and things older than both. Runes carved into the rock read: 'Here sleeps the Lindwurm. Do not wake what Rome cannot kill.'",
    "choices": [
      { "text": "Enter the lair. Glory waits in the dark.", "outcomes": [
        { "weight": 1.0, "text": "Your men light torches and descend. The tunnel narrows, then opens into a vast cavern. Gold glitters. Bones crunch underfoot. Something stirs in the dark.", "effects": { "triggerHiddenMarch": {
          "name": "The Dragon's Lair",
          "subtitle": "Slay the Lindwurm Lord.",
          "theme": "dragon",
          "depth": 4,
          "enemies": ["lair_sheep", "hate_mage", "lair_troll", "clinking_bones"],
          "boss": {
            "name": "The Lindwurm Lord",
            "enemies": ["lindwurm_lord", "lair_sheep", "lair_sheep"],
            "intro": "The cavern opens into a vast chamber of gold and bone. The Lindwurm Lord uncoils from its throne — ancient, enormous, hungry. Sheep bleat in terror at its feet.",
            "loot": ["lindwurm_fang", "dragonscale_lorica", "wyrms_hoard_ring", "dragon_banner", "throwing_aklys"],
            "lootCount": 2
          },
          "events": [
            {
              "id": "lair_creepy_mountain", "name": "The Creepy Mountain",
              "intro": "Through a crack in the tunnel wall you glimpse the outside — a creepy mountain looms in the distance, half-shrouded in unnatural fog. Leaning against its flank is an abandoned castle, once formidable, now crumbling. Tattered dragon banners hang from its towers, snapping in a wind that doesn't reach you down here.",
              "choices": [
                { "text": "Search the castle ruins from here.", "outcomes": [
                  { "weight": 0.5, "text": "Your scouts squeeze through the crack and return with a battered chest. Inside: old provisions and a solid blade.", "effects": { "grantDamage": 1, "healAll": 4, "morale": 3 } },
                  { "weight": 0.5, "text": "The ruins hold nothing but dust and dragon bones. But the view steadies your men.", "effects": { "morale": 6 } }
                ]},
                { "text": "Press on. That castle is a tomb.", "outcomes": [
                  { "weight": 1.0, "text": "You seal the crack with loose stone and move deeper. Better not to linger near whatever claimed that fortress.", "effects": { "morale": 3 } }
                ]}
              ]
            },
            {
              "id": "lair_eerie_drums", "name": "The Drums Below",
              "intro": "Strange and eerie music drifts from deeper in the tunnels — heavy with drums, rhythmic and relentless. It echoes off the stone walls until you cannot tell where it comes from. Your men grip their weapons tighter. The beat matches your heartbeat. Or perhaps your heartbeat matches it.",
              "choices": [
                { "text": "Follow the drums.", "outcomes": [
                  { "weight": 0.4, "text": "You find a circle of hate-mages around a bone drum, chanting. They scatter when they see you, leaving offerings behind.", "effects": { "grantBlock": { "amount": 2, "count": 4 }, "morale": 5 } },
                  { "weight": 0.6, "text": "The drumming grows louder, then stops. Silence. Then they come from the dark.", "effects": { "triggerCombat": { "enemies": ["hate_mage", "hate_mage", "clinking_bones", "clinking_bones"], "name": "The Drummers", "intro": "The music was a summons. Hate-mages and their skeletal servants emerge from the shadows." } } }
                ]},
                { "text": "Stuff cloth in your ears and press on.", "outcomes": [
                  { "weight": 1.0, "text": "The drums fade behind you. Your men breathe easier, though the rhythm lingers in their bones.", "effects": { "morale": 4 } }
                ]}
              ]
            },
            {
              "id": "lair_wedding_massacre", "name": "The Failed Wedding",
              "intro": "You enter a wide cavern decorated with rotting garlands and shattered pottery. Two long tables face each other across a central aisle, still set with cups and plates. Skeletons sit in the chairs — some slumped forward, some sprawled on the ground. The remains of a wedding ritual between two tribes, you realize. Something went terribly wrong. The bride and groom still sit at the head table, skeletal hands clasped together. Between them, a blade driven through both their joined hands.",
              "choices": [
                { "text": "Take the wedding blade.", "outcomes": [
                  { "weight": 0.6, "text": "You pull the blade free. The skeletons shudder but do not rise. The blade is old but sharp — and warm to the touch.", "effects": { "grantDamage": 2, "morale": -3 } },
                  { "weight": 0.4, "text": "As the blade comes free, the dead stir. The wedding guests rise, furious at the intrusion.", "effects": { "triggerCombat": { "enemies": ["clinking_bones", "clinking_bones", "clinking_bones", "clinking_bones"], "name": "The Wedding Guests", "intro": "The skeletons lurch to their feet. The wedding celebration resumes — in violence." } } }
                ]},
                { "text": "Leave them in peace. They've earned it.", "outcomes": [
                  { "weight": 1.0, "text": "You pass through quietly. One soldier crosses himself. Another whispers a prayer in a language older than Rome.", "effects": { "morale": 5, "healAll": 3 } }
                ]}
              ]
            },
            {
              "id": "lair_crimson_heart", "name": "The Crimson Heart Thermopolium",
              "intro": "Impossibly, you find what appears to be an ancient thermopolium — a Roman tavern — carved into the cavern wall. A painted sign hangs outside: a crimson heart, dripping. The interior is warm and lit by an unseen source. Cups line the counter, still full. The wine is dark and smells faintly of iron. There is no one here. There has not been anyone here for a very long time. And yet the wine is fresh.",
              "choices": [
                { "text": "Drink the wine. Your men need courage.", "outcomes": [
                  { "weight": 0.5, "text": "The wine burns going down but fills you with unnatural warmth. Your wounds close. Your fear fades. The crimson heart pulses once, then is still.", "effects": { "healAll": 8, "morale": 8 } },
                  { "weight": 0.5, "text": "The wine is sweet — too sweet. Your men feel strange. Stronger, but different. Something was in that wine.", "effects": { "healAll": 5, "morale": 5, "grantDamage": 1, "damageAll": 3 } }
                ]},
                { "text": "Leave. Nothing free in a dragon's lair comes without cost.", "outcomes": [
                  { "weight": 1.0, "text": "As you leave, you hear the faintest clink of a cup being set down behind you. You do not look back.", "effects": { "morale": 4 } }
                ]}
              ]
            }
          ]
        } } }
      ]},
      { "text": "Seal the entrance and move on. Some legends are best left sleeping.", "outcomes": [
        { "weight": 1.0, "text": "Your engineers collapse the entrance with logs and stone. The breathing stops. Your men march on, relieved — but some look back, wondering what treasures lie buried.", "effects": { "morale": 6 } }
      ]}
    ]
  },

  {
    "id": "thusneldas_ambush",
    "name": "The Chieftain's Wife",
    "minDifficulty": 5, "maxDifficulty": 5,
    "oncePerRun": true,
    "intro": "A woman's voice rings out from the trees — clear, commanding, furious. 'Romans! You took me from my husband. You paraded me through your streets. But the forest remembers, and so do I.' Your scouts report movement on all sides. Wolves. Warriors. And at their center, a woman in war paint, holding a spear.",
    "choices": [
      { "text": "We answer to no one. Form ranks and fight.", "outcomes": [
        { "weight": 1.0, "text": "She raises her spear. The forest erupts. Wolves and warriors pour from the undergrowth.", "effects": { "triggerCombat": { "enemies": ["thusnelda", "cheruscan_raider", "marsh_wolf", "marsh_wolf"], "name": "Thusnelda's Ambush", "intro": "Thusnelda, wife of Arminius, leads the attack. Her wolves obey her whistle. Her warriors obey her voice.", "loot": ["thusneldas_torc", "wolfsmother_pelt", "howl_of_defiance", "packleaders_bow", "thusneldas_standard"], "lootCount": 2 } } }
      ]},
      { "text": "Offer to negotiate. Rome has changed.", "outcomes": [
        { "weight": 0.4, "text": "She stares at you for a long time. Something shifts behind her eyes. She drops a bundle at your feet and vanishes into the trees without a word.", "effects": { "morale": 4, "grantRandomItem": ["wolfsmother_pelt", "howl_of_defiance", "packleaders_bow", "thusneldas_standard"] } },
        { "weight": 0.6, "text": "She stares at you for a long moment. 'Prove it.' She attacks.", "effects": { "triggerCombat": { "enemies": ["thusnelda", "cheruscan_raider", "marsh_wolf", "marsh_wolf"], "name": "Thusnelda's Ambush", "intro": "Thusnelda, wife of Arminius, leads the attack. Her wolves obey her whistle. Her warriors obey her voice.", "loot": ["thusneldas_torc", "wolfsmother_pelt", "howl_of_defiance", "packleaders_bow", "thusneldas_standard"], "lootCount": 2 } } }
      ]},
      { "text": "Fall back. We cannot fight the forest itself.", "outcomes": [
        { "weight": 0.7, "text": "Your men retreat through the brush. Wolves snap at the rearguard but she lets you go. The forest has spoken.", "effects": { "morale": -5, "damageAll": 3 } },
        { "weight": 0.3, "text": "You retreat cleanly. She watches from the ridge, spear in hand. Another day.", "effects": { "morale": -3 } }
      ]}
    ]
  }
];
