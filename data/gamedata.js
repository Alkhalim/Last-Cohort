// ============================================================
// Last Cohort – Encounters, Drop Tables & Config
// For classes, enemies, items, and events see their own files.
// ============================================================

const RAW_ENCOUNTERS = {
  "templates": [
    { "name": "Ambush on the Trail", "enemies": ["cheruscan_raider", "cheruscan_raider", "sling_hunter"], "intro": "Shapes burst from the undergrowth \u2014 Germanic warriors block the path." },
    { "name": "Wolves in the Mire", "enemies": ["marsh_wolf", "marsh_wolf"], "intro": "Low growls echo from the fog. Yellow eyes track your every step." },
    { "name": "Raiding Party", "enemies": ["cheruscan_raider", "sling_hunter", "sling_hunter"], "intro": "Stones whistle past. A raiding party has found your trail." },
    { "name": "The Clearing", "enemies": ["cheruscan_raider", "cheruscan_raider", "marsh_wolf", "sling_hunter"], "intro": "You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you." }
  ],
  "bossEncounters": [
    { "name": "Arminius's Champion", "enemies": ["arminius_champion", "cheruscan_raider"], "intro": "The Champion of Arminius blocks your path." },
    { "name": "The Grove Witch", "enemies": ["grove_witch", "bog_seer", "marsh_wolf"], "intro": "Green flame parts the trees. The forest itself rises." },
    { "name": "The Silent Huntsman", "minDifficulty": 2, "enemies": ["silent_huntsman", "sling_hunter", "cheruscan_raider"], "intro": "Arrows from the shadows. The Huntsman has found you." },
    { "name": "The Mire Mother", "minDifficulty": 3, "enemies": ["mire_mother", "war_boar", "boar_youngling", "boar_youngling"], "intro": "The swamp shakes. Something massive rises, flanked by her brood." },
    { "name": "The Bone Speaker", "minDifficulty": 4, "enemies": ["bone_speaker", "cursed_warrior", "cursed_warrior", "cursed_warrior", "bog_seer"], "intro": "Bones rattle. The dead walk at his command. A seer chants behind them." }
  ],
  "threatLevels": {
    "easy": [
      { "name": "Forest Scouts", "enemies": ["cheruscan_raider", "sling_hunter"], "intro": "A pair of scouts spot your column and attack." },
      { "name": "Lone Wolves", "enemies": ["marsh_wolf", "marsh_wolf"], "intro": "Wolves slink from the undergrowth, hungry and desperate." },
      { "name": "Eerie Chanting", "enemies": ["bog_seer", "cheruscan_raider"], "intro": "Chanting drifts from the fog. A seer and his guard block your path." },
      { "name": "Viper Nest", "enemies": ["fen_viper", "fen_viper"], "intro": "You step into a nest of marsh vipers. They strike without warning." },
      { "name": "Swamp Crawlers", "enemies": ["mire_leech", "mire_leech"], "intro": "Bloated shapes slither from the mud. The swamp breeds foul things." },
      { "name": "Guarded Scouts", "enemies": ["cheruscan_guardian", "cheruscan_raider", "sling_hunter"], "intro": "A guardian crouches with shield raised while scouts press the attack." }
    ],
    "mid": [
      { "name": "Ambush on the Trail", "enemies": ["cheruscan_raider", "cheruscan_raider", "sling_hunter"], "intro": "Shapes burst from the undergrowth \u2014 Germanic warriors block the path." },
      { "name": "Raiding Party", "enemies": ["cheruscan_raider", "sling_hunter", "sling_hunter"], "intro": "Stones whistle past. A raiding party has found your trail." },
      { "name": "Wolf Pack", "enemies": ["marsh_wolf", "marsh_wolf", "marsh_wolf"], "intro": "A whole wolf pack emerges from the fog. There is no retreat." },
      { "name": "Cursed Hollow", "enemies": ["bog_seer", "bog_seer", "cheruscan_raider"], "intro": "Two seers stand in a hollow, their chanting shaking the air. A warrior guards them." },
      { "name": "Wolves and Whispers", "enemies": ["marsh_wolf", "marsh_wolf", "bog_seer"], "intro": "Wolves circle in the mist while eerie chanting echoes from behind the trees." },
      { "name": "Venomous Ambush", "enemies": ["fen_viper", "fen_viper", "sling_hunter"], "intro": "Vipers and slingers attack from the swamp in a coordinated ambush." },
      { "name": "Shield Line", "enemies": ["cheruscan_shieldbearer", "cheruscan_raider", "sling_hunter"], "intro": "A shieldbearer hunkers down while warriors form behind him. A disciplined formation." },
      { "name": "Guardian Formation", "enemies": ["cheruscan_guardian", "cheruscan_guardian", "cheruscan_raider", "sling_hunter"], "intro": "Two guardians lock shields while attackers strike from behind the wall." },
      { "name": "Leech Swarm", "enemies": ["mire_leech", "mire_leech", "mire_leech"], "intro": "The ground writhes. Bloated leeches pour from the mud in a sickening wave." },
      { "name": "Spear Rain", "minDifficulty": 2, "enemies": ["spear_thrower", "spear_thrower", "cheruscan_raider"], "intro": "Spears arc from the treeline. Two warriors hurl javelin after javelin before drawing blades." },
      { "name": "Berserker Charge", "minDifficulty": 2, "enemies": ["germanic_berserker", "cheruscan_raider", "sling_hunter"], "intro": "A foam-mouthed berserker charges from the trees, warriors at his back." },
      { "name": "War Hound Pack", "minDifficulty": 3, "enemies": ["war_hound", "war_hound", "cheruscan_raider"], "intro": "Armored hounds bound through the undergrowth, a handler driving them forward." },
      { "name": "Runed Shield Line", "minDifficulty": 3, "enemies": ["runecarver", "cheruscan_shieldbearer", "cheruscan_raider"], "intro": "A runecarver crouches behind a shield line, carving wards into every surface." },
      { "name": "Cursed Patrol", "minDifficulty": 4, "enemies": ["cursed_warrior", "cursed_warrior", "bog_seer"], "intro": "Black-veined warriors shamble through the mist. A seer chants behind them." },
      { "name": "Ironbound Vanguard", "minDifficulty": 3, "enemies": ["ironbound_champion", "cheruscan_shieldbearer", "sling_hunter"], "intro": "An iron-clad warrior advances behind a shieldbearer. The more they protect him, the harder he hits." },
      { "name": "Boar Stampede", "minDifficulty": 3, "enemies": ["war_boar", "boar_youngling", "boar_youngling"], "intro": "The ground trembles. A massive boar leads its young through the undergrowth, tusks lowered." }
    ],
    "hard": [
      { "name": "The Clearing", "enemies": ["cheruscan_raider", "cheruscan_raider", "marsh_wolf", "sling_hunter"], "intro": "You stumble into a clearing \u2014 and into an ambush. Steel and fangs surround you." },
      { "name": "War Band", "enemies": ["cheruscan_raider", "cheruscan_raider", "cheruscan_raider", "sling_hunter"], "intro": "A full war band charges from the trees. Prepare for a desperate fight." },
      { "name": "The Oak Shield", "enemies": ["oak_shield", "cheruscan_raider", "sling_hunter"], "intro": "A massive warrior blocks the trail, oak shield raised. His warband flanks you." },
      { "name": "Ritual Guard", "enemies": ["oak_shield", "bog_seer", "bog_seer"], "intro": "An elite warrior guards two seers performing a dark ritual. Stop them or be consumed." },
      { "name": "The Hunting Party", "enemies": ["oak_shield", "marsh_wolf", "marsh_wolf"], "intro": "An elite warrior commands a pair of trained war wolves. They advance as one." },
      { "name": "Poison Grove", "enemies": ["fen_viper", "fen_viper", "bog_seer", "cheruscan_raider"], "intro": "Vipers slither among the roots as a seer chants protection. A warrior guards the approach." },
      { "name": "The Burning Effigy", "enemies": ["wicker_man", "cheruscan_shieldbearer", "bog_seer"], "intro": "A towering wicker effigy burns in the clearing. Its smoke protects the warriors gathered around it." },
      { "name": "Shield Wall", "enemies": ["cheruscan_shieldbearer", "cheruscan_shieldbearer", "sling_hunter", "sling_hunter"], "intro": "Two shieldbearers form an impenetrable wall while slingers rain stones from behind." },
      { "name": "Swamp Horror", "enemies": ["mire_leech", "mire_leech", "fen_viper", "bog_seer"], "intro": "The swamp itself attacks \u2014 leeches, vipers, and a chanting seer drive the assault." },
      { "name": "Javelin Ambush", "minDifficulty": 2, "enemies": ["spear_thrower", "spear_thrower", "cheruscan_raider", "sling_hunter"], "intro": "Javelins rain from the trees as spearmen prepare to charge. You have moments before they close the gap." },
      { "name": "Berserker Warband", "minDifficulty": 2, "enemies": ["germanic_berserker", "germanic_berserker", "cheruscan_shieldbearer"], "intro": "Two berserkers charge screaming from the trees. A shieldbearer covers their flank." },
      { "name": "The Kennels", "minDifficulty": 3, "enemies": ["war_hound", "war_hound", "war_hound", "sling_hunter"], "intro": "A pack of armored war hounds pours from a makeshift kennel. A handler slings stones from behind." },
      { "name": "Warded Warband", "minDifficulty": 3, "enemies": ["runecarver", "cheruscan_raider", "cheruscan_raider", "sling_hunter"], "intro": "Rune-warded warriors advance behind a wall of carved shields. Every blow glances off." },
      { "name": "Bone Court", "minDifficulty": 4, "enemies": ["cursed_warrior", "cursed_warrior", "cursed_warrior", "bog_seer"], "intro": "Three cursed warriors stand in a circle of bones. A seer orchestrates their suffering." },
      { "name": "The Iron Wall", "minDifficulty": 3, "enemies": ["ironbound_champion", "cheruscan_shieldbearer", "cheruscan_shieldbearer", "sling_hunter"], "intro": "Two shieldbearers funnel their defenses into an iron-clad champion. He grows stronger with every shield raised." },
      { "name": "The Sow's Fury", "minDifficulty": 3, "enemies": ["war_boar", "war_boar", "boar_youngling", "boar_youngling"], "intro": "Two massive boars and their young block the trail. The ground shakes with their fury." }
    ]
  },
  "dropTables": {
    "cheruscan_raider": { "nothingChance": 0.25, "tiers": [
      { "chance": 0.35, "items": ["iron_gladius", "raider_shield", "herb_pouch"] },
      { "chance": 0.18, "items": ["woad_charm", "fang_necklace", "legionary_lorica", "officers_cloak"] },
      { "chance": 0.05, "items": ["chiefs_spear", "runic_stone"] },
      { "chance": 0.10, "items": ["cheruscan_torc"] },
      { "chance": 0.07, "items": ["fates_coin", "seers_knucklebone"] },
      { "chance": 0.05, "items": ["gladiators_wraps", "commanders_signet"], "minDifficulty": 2 }
    ] },
    "sling_hunter": { "nothingChance": 0.25, "tiers": [
      { "chance": 0.30, "items": ["sling_stones", "bone_needle_kit", "raider_shield"] },
      { "chance": 0.20, "items": ["hunters_cloak", "scouts_sling", "scorpio_crossbow"] },
      { "chance": 0.05, "items": ["runic_stone", "legion_composite_bow"] },
      { "chance": 0.10, "items": ["slingers_eye"] },
      { "chance": 0.10, "items": ["scouts_leather", "spotters_lens"], "minDifficulty": 2 }
    ] },
    "marsh_wolf": { "nothingChance": 0.20, "tiers": [
      { "chance": 0.30, "items": ["wolf_pelt", "herb_pouch"] },
      { "chance": 0.20, "items": ["fang_necklace", "legionary_lorica"] },
      { "chance": 0.08, "items": ["marsh_fang", "runic_stone"] },
      { "chance": 0.12, "items": ["wolf_fang_blade"] },
      { "chance": 0.10, "items": ["gladiators_wraps"], "minDifficulty": 2 }
    ] },
    "fen_viper": { "nothingChance": 0.30, "tiers": [
      { "chance": 0.25, "items": ["herb_pouch", "bone_needle_kit"] },
      { "chance": 0.15, "items": ["fang_necklace", "venom_gland", "medicus_vestments"] },
      { "chance": 0.05, "items": ["marsh_fang"] },
      { "chance": 0.10, "items": ["viper_venom_vial"] },
      { "chance": 0.10, "items": ["surgeons_scalpel"] },
      { "chance": 0.05, "items": ["apothecary_mortar"], "minDifficulty": 3 }
    ] },
    "bog_seer": { "nothingChance": 0.25, "tiers": [
      { "chance": 0.25, "items": ["herb_pouch", "bone_needle_kit"] },
      { "chance": 0.15, "items": ["woad_charm", "fang_necklace", "medicus_vestments", "cursed_die"] },
      { "chance": 0.08, "items": ["runic_stone", "apothecary_mortar"] },
      { "chance": 0.10, "items": ["seers_eye", "fates_coin", "seers_knucklebone"] },
      { "chance": 0.10, "items": ["scorpio_crossbow", "surgeons_scalpel"] }
    ] },
    "oak_shield": { "nothingChance": 0.05, "tiers": [
      { "chance": 0.30, "items": ["iron_gladius", "raider_shield", "wolf_pelt"] },
      { "chance": 0.25, "items": ["woad_charm", "fang_necklace", "hunters_cloak", "legionary_lorica", "officers_cloak"] },
      { "chance": 0.10, "items": ["chiefs_spear", "runic_stone", "legion_composite_bow"] },
      { "chance": 0.15, "items": ["oak_splinter"] },
      { "chance": 0.15, "items": ["boar_tusk_pauldron", "aquila_spearhead"], "minDifficulty": 4 }
    ] },
    "cheruscan_shieldbearer": { "nothingChance": 0.15, "tiers": [
      { "chance": 0.35, "items": ["raider_shield", "iron_gladius", "wolf_pelt"] },
      { "chance": 0.15, "items": ["woad_charm", "hunters_cloak", "officers_cloak"] },
      { "chance": 0.10, "items": ["chiefs_spear"] },
      { "chance": 0.15, "items": ["shieldbearers_grip"] },
      { "chance": 0.10, "items": ["boar_tusk_pauldron"], "minDifficulty": 4 }
    ] },
    "mire_leech": { "nothingChance": 0.45, "tiers": [
      { "chance": 0.25, "items": ["herb_pouch", "bone_needle_kit"] },
      { "chance": 0.12, "items": ["fang_necklace", "marsh_fang", "medicus_vestments"] },
      { "chance": 0.13, "items": ["leech_bile_flask"] },
      { "chance": 0.05, "items": ["herbalists_robe"], "minDifficulty": 4 }
    ] },
    "wicker_man": { "nothingChance": 0.05, "tiers": [
      { "chance": 0.30, "items": ["woad_charm", "herb_pouch"] },
      { "chance": 0.25, "items": ["runic_stone", "fang_necklace", "cursed_die"] },
      { "chance": 0.10, "items": ["chiefs_spear", "arm_ring_of_arminius"] },
      { "chance": 0.20, "items": ["wicker_ash"] },
      { "chance": 0.10, "items": ["bloodstone_pendant", "windreaders_charm"], "minDifficulty": 5 }
    ] },
    "cheruscan_guardian": { "nothingChance": 0.25, "tiers": [
      { "chance": 0.35, "items": ["raider_shield", "wolf_pelt"] },
      { "chance": 0.20, "items": ["shieldbearers_grip", "woad_charm", "legionary_lorica"] },
      { "chance": 0.10, "items": ["seers_eye"] },
      { "chance": 0.10, "items": ["officers_cloak"] }
    ] },
    "germanic_berserker": { "nothingChance": 0.15, "tiers": [
      { "chance": 0.30, "items": ["iron_gladius", "wolf_pelt", "raider_shield"] },
      { "chance": 0.15, "items": ["fang_necklace", "cheruscan_torc", "gladiators_wraps"] },
      { "chance": 0.10, "items": ["chiefs_spear"] },
      { "chance": 0.15, "items": ["berserker_mushroom"] },
      { "chance": 0.10, "items": ["vine_staff", "commanders_signet"] },
      { "chance": 0.05, "items": ["bloodstone_pendant"], "minDifficulty": 5 }
    ] },
    "runecarver": { "nothingChance": 0.20, "tiers": [
      { "chance": 0.30, "items": ["raider_shield", "woad_charm"] },
      { "chance": 0.20, "items": ["seers_eye", "shieldbearers_grip"] },
      { "chance": 0.10, "items": ["runic_stone"] },
      { "chance": 0.10, "items": ["marksmans_brigandine", "scouts_leather"] },
      { "chance": 0.10, "items": ["battle_standard_cord"], "minDifficulty": 4 }
    ] },
    "war_hound": { "nothingChance": 0.20, "tiers": [
      { "chance": 0.30, "items": ["wolf_pelt", "herb_pouch"] },
      { "chance": 0.20, "items": ["fang_necklace", "wolf_fang_blade"] },
      { "chance": 0.08, "items": ["marsh_fang"] },
      { "chance": 0.12, "items": ["hound_collar"] },
      { "chance": 0.10, "items": ["spotters_lens", "gladiators_wraps"] }
    ] },
    "cursed_warrior": { "nothingChance": 0.10, "tiers": [
      { "chance": 0.25, "items": ["herb_pouch", "bone_needle_kit", "raider_shield"] },
      { "chance": 0.20, "items": ["seers_eye", "woad_charm"] },
      { "chance": 0.10, "items": ["runic_stone"] },
      { "chance": 0.15, "items": ["cursed_bone_blade"] },
      { "chance": 0.10, "items": ["herbalists_robe", "aquila_spearhead"] },
      { "chance": 0.10, "items": ["gilded_cuirass", "windreaders_charm"], "minDifficulty": 5 }
    ] },
    "spear_thrower": { "nothingChance": 0.20, "tiers": [
      { "chance": 0.35, "items": ["iron_gladius", "raider_shield", "wolf_pelt"] },
      { "chance": 0.20, "items": ["fang_necklace", "cheruscan_torc", "hunters_cloak"] },
      { "chance": 0.10, "items": ["chiefs_spear", "scorpio_crossbow"] },
      { "chance": 0.15, "items": ["gladiators_wraps", "scouts_leather"] }
    ] },
    "boar_youngling": { "nothingChance": 0.50, "tiers": [
      { "chance": 0.35, "items": ["wolf_pelt", "herb_pouch"] },
      { "chance": 0.15, "items": ["fang_necklace"] }
    ] },
    "war_boar": { "nothingChance": 0.15, "tiers": [
      { "chance": 0.30, "items": ["wolf_pelt", "herb_pouch", "raider_shield"] },
      { "chance": 0.25, "items": ["fang_necklace", "legionary_lorica", "gladiators_wraps"] },
      { "chance": 0.15, "items": ["hound_collar", "berserker_mushroom"] },
      { "chance": 0.15, "items": ["mire_mothers_tusk"] }
    ] },
    "ironbound_champion": { "nothingChance": 0.10, "tiers": [
      { "chance": 0.30, "items": ["iron_gladius", "raider_shield", "wolf_pelt"] },
      { "chance": 0.25, "items": ["shieldbearers_grip", "legionary_lorica", "cheruscan_torc"] },
      { "chance": 0.15, "items": ["champions_helm", "boar_tusk_pauldron"] },
      { "chance": 0.20, "items": ["oak_splinter", "warlords_blade"] }
    ] },
    "arminius_champion": { "nothingChance": 0.0, "tiers": [{ "chance": 1.0, "items": "__BOSS_DROP_POOL__" }] },
    "grove_witch": { "nothingChance": 0.0, "tiers": [{ "chance": 1.0, "items": "__BOSS_DROP_POOL__" }] },
    "silent_huntsman": { "nothingChance": 0.0, "tiers": [{ "chance": 1.0, "items": "__BOSS_DROP_POOL__" }] },
    "mire_mother": { "nothingChance": 0.0, "tiers": [{ "chance": 1.0, "items": "__BOSS_DROP_POOL__" }] },
    "bone_speaker": { "nothingChance": 0.0, "tiers": [{ "chance": 1.0, "items": "__BOSS_DROP_POOL__" }] }
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
  "equipSlots": { "weapon": 2, "armor": 2, "trinket": 3 },
  "bossDropPool": ["champions_helm", "arm_ring_of_arminius", "warlords_blade", "huntsmans_arrow", "mire_mothers_tusk", "bone_speakers_skull", "legion_composite_bow", "apothecary_mortar", "boar_tusk_pauldron", "aquila_spearhead", "marksmans_brigandine", "herbalists_robe", "bloodstone_pendant", "gilded_cuirass", "windreaders_charm", "battle_standard_cord", "varus_shield", "heartwood_charm", "mars_denarius", "pact_of_wolves", "centurions_gorget", "serpents_coil", "eagle_lost_ninth", "lupas_fang"],
  "baseDiceCount": 4
};
