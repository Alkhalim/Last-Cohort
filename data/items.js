// ============================================================
// Last Cohort – Item Data
// Edit this file to add/modify items.
// ============================================================

const RAW_ITEMS = {
  "iron_gladius": { "id": "iron_gladius", "name": "Iron Gladius", "slot": "weapon", "rarity": "common", "classTags": ["melee", "command"], "stats": { "damage": 2 }, "description": "A sturdy blade taken from a fallen raider." },
  "raider_shield": { "id": "raider_shield", "name": "Raider's Shield", "slot": "armor", "rarity": "common", "classTags": ["roman"], "stats": { "block": 2 }, "description": "Rough wood and hide, but it turns a blade." },
  "wolf_pelt": { "id": "wolf_pelt", "name": "Wolf Pelt", "slot": "armor", "rarity": "common", "classTags": ["roman"], "stats": { "maxHp": 4 }, "description": "Thick fur that wards off the cold and softens blows." },
  "sling_stones": { "id": "sling_stones", "name": "Sling Stones", "slot": "weapon", "rarity": "common", "classTags": ["command", "support", "ranged"], "stats": { "damage": 1 }, "description": "Smooth river stones, still in their pouch." },
  "bone_needle_kit": { "id": "bone_needle_kit", "name": "Bone Needle Kit", "slot": "trinket", "rarity": "common", "classTags": ["support"], "stats": { "heal": 1 }, "description": "Germanic surgical tools. Crude but effective." },
  "herb_pouch": { "id": "herb_pouch", "name": "Herb Pouch", "slot": "trinket", "rarity": "common", "classTags": ["command", "support"], "stats": { "heal": 1 }, "description": "Dried marsh herbs with surprising potency." },
  "woad_charm": { "id": "woad_charm", "name": "Woad Charm", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "maxHp": 3, "block": 1 }, "description": "A blue-stained bone token. It feels warm to the touch." },
  "hunters_cloak": { "id": "hunters_cloak", "name": "Hunter's Cloak", "slot": "armor", "rarity": "uncommon", "classTags": ["command", "support", "ranged"], "stats": { "maxHp": 5 }, "description": "Woven from marsh reeds and wolf hair. Surprisingly tough." },
  "fang_necklace": { "id": "fang_necklace", "name": "Fang Necklace", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "damage": 1, "maxHp": 2 }, "description": "A string of wolf fangs. The men eye it uneasily." },
  "chiefs_spear": { "id": "chiefs_spear", "name": "Chieftain's Spear", "slot": "weapon", "rarity": "rare", "classTags": ["melee", "command"], "stats": { "damage": 4 }, "special": "Kills restore +3 extra morale.", "description": "Ash-hafted and iron-tipped. Taken from a war chief. Kills with this weapon rally the men." },
  "marsh_fang": { "id": "marsh_fang", "name": "Marsh Fang", "slot": "trinket", "rarity": "rare", "classTags": ["support"], "stats": { "heal": 2, "maxHp": 3 }, "special": "Healing also clears 1 poison from the target.", "description": "A hollowed fang filled with dark salve. Potent medicine that purges toxins." },
  "runic_stone": { "id": "runic_stone", "name": "Runic Stone", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "extraDice": 1 }, "special": "+1 die per turn.", "description": "A stone carved with strange runes. It hums faintly. The dice pool grows." },
  "scouts_sling": { "id": "scouts_sling", "name": "Scout's Sling", "slot": "weapon", "rarity": "uncommon", "classTags": ["support", "ranged"], "stats": { "damage": 2 }, "description": "A well-worn sling. Even the surgeon can fight." },
  "champions_helm": { "id": "champions_helm", "name": "Champion's Helm", "slot": "armor", "rarity": "rare", "classTags": ["melee", "command"], "stats": { "maxHp": 6, "block": 2 }, "special": "Reduces morale decay by 1 per turn.", "description": "A heavy iron helm ripped from the champion. Wearing it steadies the nerves." },
  "arm_ring_of_arminius": { "id": "arm_ring_of_arminius", "name": "Arm Ring of Arminius", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 2, "maxHp": 3 }, "special": "Start each encounter with +10 morale.", "description": "A gold arm ring inscribed with Germanic runes. It fills the wearer with defiance." },
  "warlords_blade": { "id": "warlords_blade", "name": "Warlord's Blade", "slot": "weapon", "rarity": "rare", "classTags": ["melee"], "stats": { "damage": 5 }, "special": "Attacks deal 2 extra damage to block.", "description": "A massive iron sword that splinters shields on impact." },

  // --- Enemy-unique drops ---
  "cheruscan_torc": { "id": "cheruscan_torc", "name": "Cheruscan Torc", "slot": "trinket", "rarity": "uncommon", "classTags": ["melee", "command"], "stats": { "damage": 1, "block": 1 }, "description": "A twisted bronze neck ring torn from a raider. It still holds the warmth of its owner." },
  "slingers_eye": { "id": "slingers_eye", "name": "Slinger's Eye", "slot": "trinket", "rarity": "uncommon", "classTags": ["command", "support", "ranged"], "stats": { "damage": 2 }, "description": "A polished river stone with a hole through the center. Looking through it steadies the hand." },
  "wolf_fang_blade": { "id": "wolf_fang_blade", "name": "Wolf-Fang Blade", "slot": "weapon", "rarity": "uncommon", "classTags": ["melee", "roman"], "stats": { "damage": 2, "maxHp": 1 }, "description": "A short blade with a wolf fang set into the pommel. It bites twice." },
  "viper_venom_vial": { "id": "viper_venom_vial", "name": "Viper Venom Vial", "slot": "trinket", "rarity": "uncommon", "classTags": ["support"], "stats": { "damage": 1, "heal": 1 }, "description": "Diluted fen viper venom. Deadly as poison, useful as medicine." },
  "venom_gland": { "id": "venom_gland", "name": "Venom Gland", "slot": "trinket", "rarity": "uncommon", "classTags": ["support", "ranged"], "stats": { "poison": 1 }, "description": "A fen viper's venom gland, still dripping. Coats weapons in toxin." },
  "seers_eye": { "id": "seers_eye", "name": "Seer's Eye", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "maxHp": 2, "block": 1 }, "description": "A milky glass bead from a bog seer's staff. It seems to pulse faintly in the dark." },
  "oak_splinter": { "id": "oak_splinter", "name": "Oak Splinter", "slot": "weapon", "rarity": "rare", "classTags": ["melee", "command"], "stats": { "damage": 3, "block": 1 }, "special": "Grants +2 block to all allies when this unit uses a block skill.", "description": "A shard from the Oak Shield's great barrier. Dense as iron and sharp as spite." },
  "leech_bile_flask": { "id": "leech_bile_flask", "name": "Leech Bile Flask", "slot": "trinket", "rarity": "uncommon", "classTags": ["support"], "stats": { "heal": 2 }, "description": "Bile harvested from a mire leech. Foul-smelling but remarkably effective on wounds." },
  "wicker_ash": { "id": "wicker_ash", "name": "Wicker Ash", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 1, "block": 2 }, "special": "Enemies take 1 damage at the start of each turn (burning aura).", "description": "Ash from a fallen wicker man, still warm. It smells of sacrifice and old power." },
  "shieldbearers_grip": { "id": "shieldbearers_grip", "name": "Shieldbearer's Grip", "slot": "armor", "rarity": "uncommon", "classTags": ["melee", "command"], "stats": { "block": 3 }, "description": "A leather hand-strap ripped from the shieldbearer's shield. Worn but sturdy." },

  "scorpio_crossbow": { "id": "scorpio_crossbow", "name": "Scorpio Crossbow", "slot": "weapon", "rarity": "uncommon", "classTags": ["ranged"], "stats": { "damage": 3 }, "description": "A compact hand-crossbow salvaged from a Roman siege train. Hits harder than any sling." },
  "legion_composite_bow": { "id": "legion_composite_bow", "name": "Legion Composite Bow", "slot": "weapon", "rarity": "rare", "classTags": ["ranged"], "stats": { "damage": 4 }, "special": "Attacks apply 1 Poison.", "description": "A recurve bow strung with sinew. Its arrows bite deep and fester in the wound." },

  // --- March 1 (base) tag-unique items ---
  "legionary_lorica": { "id": "legionary_lorica", "name": "Legionary's Lorica", "slot": "armor", "rarity": "uncommon", "classTags": ["melee"], "stats": { "block": 2, "maxHp": 2 }, "description": "Battered segmented plate salvaged from a fallen comrade. Still holds against a blade." },
  "officers_cloak": { "id": "officers_cloak", "name": "Officer's Cloak", "slot": "armor", "rarity": "uncommon", "classTags": ["command"], "stats": { "block": 1, "maxHp": 4 }, "description": "A red wool cloak marking rank. The men take heart seeing it." },
  "surgeons_scalpel": { "id": "surgeons_scalpel", "name": "Surgeon's Scalpel", "slot": "weapon", "rarity": "uncommon", "classTags": ["support"], "stats": { "damage": 1, "heal": 2 }, "description": "A keen Roman surgical blade. Cuts flesh to mend it." },
  "medicus_vestments": { "id": "medicus_vestments", "name": "Medicus Vestments", "slot": "armor", "rarity": "uncommon", "classTags": ["support"], "stats": { "maxHp": 3, "heal": 1 }, "description": "Linen robes stained with old blood. Pockets sewn with pouches for herbs and tools." },

  // --- March 2 new items ---
  "gladiators_wraps": { "id": "gladiators_wraps", "name": "Gladiator's Wraps", "slot": "trinket", "rarity": "uncommon", "classTags": ["melee"], "stats": { "damage": 2, "block": 1 }, "minDifficulty": 2, "description": "Bloodstained hand wraps from the arena. They steady the grip and harden the fist." },
  "vine_staff": { "id": "vine_staff", "name": "Centurion's Vine Staff", "slot": "weapon", "rarity": "uncommon", "classTags": ["command"], "stats": { "damage": 2, "heal": 1 }, "minDifficulty": 2, "description": "The vitis — symbol of a centurion's authority. It commands respect and breaks bones." },
  "commanders_signet": { "id": "commanders_signet", "name": "Commander's Signet", "slot": "trinket", "rarity": "uncommon", "classTags": ["command"], "stats": { "damage": 1, "block": 1, "maxHp": 1 }, "minDifficulty": 2, "description": "A bronze signet ring. The men salute when they see it gleam." },
  "scouts_leather": { "id": "scouts_leather", "name": "Scout's Leather", "slot": "armor", "rarity": "uncommon", "classTags": ["ranged"], "stats": { "maxHp": 3, "damage": 1 }, "minDifficulty": 2, "description": "Light leather armor worn by Roman scouts. Doesn't slow the draw." },
  "spotters_lens": { "id": "spotters_lens", "name": "Spotter's Lens", "slot": "trinket", "rarity": "uncommon", "classTags": ["ranged"], "stats": { "damage": 2, "maxHp": 1 }, "minDifficulty": 2, "description": "A polished glass disc set in bronze. Everything at distance becomes clear." },

  // --- Difficulty 2+ unique drops ---
  "berserker_mushroom": { "id": "berserker_mushroom", "name": "Berserker Mushroom", "slot": "trinket", "rarity": "uncommon", "classTags": ["melee", "roman"], "stats": { "damage": 2, "maxHp": -2 }, "minDifficulty": 2, "description": "The sacred mushroom of the berserkers. Grants fury at a cost." },
  "huntsmans_arrow": { "id": "huntsmans_arrow", "name": "Huntsman's Arrow", "slot": "trinket", "rarity": "rare", "classTags": ["roman", "ranged"], "stats": { "damage": 3 }, "special": "Attacks can target any row.", "minDifficulty": 2, "description": "An arrow pulled from a Roman shield. It flew true from impossible distance." },

  // --- March 3 new items ---
  "apothecary_mortar": { "id": "apothecary_mortar", "name": "Apothecary's Mortar", "slot": "weapon", "rarity": "rare", "classTags": ["support"], "stats": { "damage": 2, "heal": 3 }, "minDifficulty": 3, "description": "A heavy stone mortar for grinding herbs. Makes a decent bludgeon in a pinch." },
  "marksmans_brigandine": { "id": "marksmans_brigandine", "name": "Marksman's Brigandine", "slot": "armor", "rarity": "rare", "classTags": ["ranged"], "stats": { "maxHp": 5, "block": 1, "damage": 1 }, "minDifficulty": 3, "description": "Studded leather with iron plates at the vitals. Built for soldiers who fight standing still." },

  // --- Difficulty 3+ unique drops ---
  "hound_collar": { "id": "hound_collar", "name": "War Hound Collar", "slot": "trinket", "rarity": "uncommon", "classTags": ["melee", "command"], "stats": { "damage": 1, "maxHp": 3 }, "minDifficulty": 3, "description": "A spiked collar from a war hound. Wearing it feels wrong, but it toughens the spirit." },
  "mire_mothers_tusk": { "id": "mire_mothers_tusk", "name": "Mire Mother's Tusk", "slot": "weapon", "rarity": "rare", "classTags": ["melee"], "stats": { "damage": 4, "maxHp": 2 }, "special": "Kills heal the wielder for 3 HP.", "minDifficulty": 3, "description": "A massive tusk ripped from the Mire Mother. It pulses with feral vitality." },

  // --- March 4 new items ---
  "boar_tusk_pauldron": { "id": "boar_tusk_pauldron", "name": "Boar Tusk Pauldron", "slot": "armor", "rarity": "rare", "classTags": ["melee"], "stats": { "block": 4, "maxHp": 3 }, "minDifficulty": 4, "description": "A shoulder guard carved from boar tusk and bound with iron wire. It turns blades and bolsters resolve." },
  "aquila_spearhead": { "id": "aquila_spearhead", "name": "Aquila Spearhead", "slot": "weapon", "rarity": "rare", "classTags": ["command"], "stats": { "damage": 3, "maxHp": 2 }, "minDifficulty": 4, "description": "The broken tip of a legionary eagle-standard, reforged into a spearhead. It carries the weight of Rome." },
  "battle_standard_cord": { "id": "battle_standard_cord", "name": "Battle Standard Cord", "slot": "trinket", "rarity": "rare", "classTags": ["command"], "stats": { "damage": 2, "block": 1, "maxHp": 2 }, "minDifficulty": 4, "description": "A braided cord cut from a legion battle standard. It hums with the memory of ten thousand marches." },
  "herbalists_robe": { "id": "herbalists_robe", "name": "Herbalist's Robe", "slot": "armor", "rarity": "rare", "classTags": ["support"], "stats": { "maxHp": 5, "heal": 2 }, "minDifficulty": 4, "description": "A Germanic healer's robe, woven with dried herbs. It smells of life even in this place of death." },

  // --- Difficulty 4+ unique drops ---
  "cursed_bone_blade": { "id": "cursed_bone_blade", "name": "Cursed Bone Blade", "slot": "weapon", "rarity": "uncommon", "classTags": ["melee", "command", "support"], "stats": { "damage": 2 }, "minDifficulty": 4, "description": "A blade carved from human bone. It cuts deep but chills the hand." },
  "bone_speakers_skull": { "id": "bone_speakers_skull", "name": "Bone Speaker's Skull", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "maxHp": 4, "block": 2 }, "special": "Morale decay reduced by 2 per turn.", "minDifficulty": 4, "description": "The skull of the Bone Speaker. Silencing it silences the dread." },

  // --- March 5 new items ---
  "bloodstone_pendant": { "id": "bloodstone_pendant", "name": "Bloodstone Pendant", "slot": "trinket", "rarity": "rare", "classTags": ["melee"], "stats": { "damage": 3, "block": 2 }, "minDifficulty": 5, "description": "A dark red stone veined with black. It pulses in time with the wearer's heartbeat — faster in battle." },
  "gilded_cuirass": { "id": "gilded_cuirass", "name": "Gilded Cuirass", "slot": "armor", "rarity": "rare", "classTags": ["command"], "stats": { "block": 2, "maxHp": 5 }, "minDifficulty": 5, "description": "A ceremonial breastplate plated in gold. Too heavy for parades, perfect for war." },
  "windreaders_charm": { "id": "windreaders_charm", "name": "Windreader's Charm", "slot": "trinket", "rarity": "rare", "classTags": ["ranged"], "stats": { "damage": 3, "maxHp": 2 }, "minDifficulty": 5, "description": "A hollow bone that whistles when the wind shifts. The archer who carries it reads the air like scripture." }
};
