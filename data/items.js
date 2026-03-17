// ============================================================
// Last Cohort – Item Data
// Edit this file to add/modify items.
// ============================================================

const RAW_ITEMS = {
  "iron_gladius": { "id": "iron_gladius", "name": "Iron Gladius", "slot": "weapon", "rarity": "common", "classTags": ["heavy", "command"], "stats": { "damage": 2 }, "description": "A sturdy blade taken from a fallen raider." },
  "raider_shield": { "id": "raider_shield", "name": "Raider's Shield", "slot": "armor", "rarity": "common", "classTags": ["roman"], "stats": { "block": 2 }, "description": "Rough wood and hide, but it turns a blade." },
  "wolf_pelt": { "id": "wolf_pelt", "name": "Wolf Pelt", "slot": "armor", "rarity": "common", "classTags": ["roman"], "stats": { "maxHp": 4 }, "description": "Thick fur that wards off the cold and softens blows." },
  "sling_stones": { "id": "sling_stones", "name": "Sling Stones", "slot": "weapon", "rarity": "common", "classTags": ["command", "support"], "stats": { "damage": 1 }, "description": "Smooth river stones, still in their pouch." },
  "bone_needle_kit": { "id": "bone_needle_kit", "name": "Bone Needle Kit", "slot": "trinket", "rarity": "common", "classTags": ["support"], "stats": { "heal": 1 }, "description": "Germanic surgical tools. Crude but effective." },
  "herb_pouch": { "id": "herb_pouch", "name": "Herb Pouch", "slot": "trinket", "rarity": "common", "classTags": ["command", "support"], "stats": { "heal": 1 }, "description": "Dried marsh herbs with surprising potency." },
  "woad_charm": { "id": "woad_charm", "name": "Woad Charm", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "maxHp": 3, "block": 1 }, "description": "A blue-stained bone token. It feels warm to the touch." },
  "hunters_cloak": { "id": "hunters_cloak", "name": "Hunter's Cloak", "slot": "armor", "rarity": "uncommon", "classTags": ["command", "support"], "stats": { "maxHp": 5 }, "description": "Woven from marsh reeds and wolf hair. Surprisingly tough." },
  "fang_necklace": { "id": "fang_necklace", "name": "Fang Necklace", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "damage": 1, "maxHp": 2 }, "description": "A string of wolf fangs. The men eye it uneasily." },
  "chiefs_spear": { "id": "chiefs_spear", "name": "Chieftain's Spear", "slot": "weapon", "rarity": "rare", "classTags": ["heavy"], "stats": { "damage": 4 }, "special": "Kills restore +3 extra morale.", "description": "Ash-hafted and iron-tipped. Taken from a war chief. Kills with this weapon rally the men." },
  "marsh_fang": { "id": "marsh_fang", "name": "Marsh Fang", "slot": "trinket", "rarity": "rare", "classTags": ["support"], "stats": { "heal": 2, "maxHp": 3 }, "special": "Healing also clears 1 poison from the target.", "description": "A hollowed fang filled with dark salve. Potent medicine that purges toxins." },
  "runic_stone": { "id": "runic_stone", "name": "Runic Stone", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "extraDice": 1 }, "special": "+1 die per turn.", "description": "A stone carved with strange runes. It hums faintly. The dice pool grows." },
  "scouts_sling": { "id": "scouts_sling", "name": "Scout's Sling", "slot": "weapon", "rarity": "uncommon", "classTags": ["support"], "stats": { "damage": 2 }, "description": "A well-worn sling. Even the surgeon can fight." },
  "champions_helm": { "id": "champions_helm", "name": "Champion's Helm", "slot": "armor", "rarity": "rare", "classTags": ["heavy", "command"], "stats": { "maxHp": 6, "block": 2 }, "special": "Reduces morale decay by 1 per turn.", "description": "A heavy iron helm ripped from the champion. Wearing it steadies the nerves." },
  "arm_ring_of_arminius": { "id": "arm_ring_of_arminius", "name": "Arm Ring of Arminius", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 2, "maxHp": 3 }, "special": "Start each encounter with +10 morale.", "description": "A gold arm ring inscribed with Germanic runes. It fills the wearer with defiance." },
  "warlords_blade": { "id": "warlords_blade", "name": "Warlord's Blade", "slot": "weapon", "rarity": "rare", "classTags": ["heavy"], "stats": { "damage": 5 }, "special": "Attacks deal 2 extra damage to block.", "description": "A massive iron sword that splinters shields on impact." },

  // --- Enemy-unique drops ---
  "cheruscan_torc": { "id": "cheruscan_torc", "name": "Cheruscan Torc", "slot": "trinket", "rarity": "uncommon", "classTags": ["heavy", "command"], "stats": { "damage": 1, "block": 1 }, "description": "A twisted bronze neck ring torn from a raider. It still holds the warmth of its owner." },
  "slingers_eye": { "id": "slingers_eye", "name": "Slinger's Eye", "slot": "trinket", "rarity": "uncommon", "classTags": ["command", "support"], "stats": { "damage": 2 }, "description": "A polished river stone with a hole through the center. Looking through it steadies the hand." },
  "wolf_fang_blade": { "id": "wolf_fang_blade", "name": "Wolf-Fang Blade", "slot": "weapon", "rarity": "uncommon", "classTags": ["heavy", "roman"], "stats": { "damage": 2, "maxHp": 1 }, "description": "A short blade with a wolf fang set into the pommel. It bites twice." },
  "viper_venom_vial": { "id": "viper_venom_vial", "name": "Viper Venom Vial", "slot": "trinket", "rarity": "uncommon", "classTags": ["support"], "stats": { "damage": 1, "heal": 1 }, "description": "Diluted fen viper venom. Deadly as poison, useful as medicine." },
  "seers_eye": { "id": "seers_eye", "name": "Seer's Eye", "slot": "trinket", "rarity": "uncommon", "classTags": ["roman"], "stats": { "maxHp": 2, "block": 1 }, "description": "A milky glass bead from a bog seer's staff. It seems to pulse faintly in the dark." },
  "oak_splinter": { "id": "oak_splinter", "name": "Oak Splinter", "slot": "weapon", "rarity": "rare", "classTags": ["heavy", "command"], "stats": { "damage": 3, "block": 1 }, "special": "Grants +2 block to all allies when this unit uses a block skill.", "description": "A shard from the Oak Shield's great barrier. Dense as iron and sharp as spite." },
  "leech_bile_flask": { "id": "leech_bile_flask", "name": "Leech Bile Flask", "slot": "trinket", "rarity": "uncommon", "classTags": ["support"], "stats": { "heal": 2 }, "description": "Bile harvested from a mire leech. Foul-smelling but remarkably effective on wounds." },
  "wicker_ash": { "id": "wicker_ash", "name": "Wicker Ash", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 1, "block": 2 }, "special": "Enemies take 1 damage at the start of each turn (burning aura).", "description": "Ash from a fallen wicker man, still warm. It smells of sacrifice and old power." },
  "shieldbearers_grip": { "id": "shieldbearers_grip", "name": "Shieldbearer's Grip", "slot": "armor", "rarity": "uncommon", "classTags": ["heavy", "command"], "stats": { "block": 3 }, "description": "A leather hand-strap ripped from the shieldbearer's shield. Worn but sturdy." },

  // --- Difficulty 2+ unique drops ---
  "berserker_mushroom": { "id": "berserker_mushroom", "name": "Berserker Mushroom", "slot": "trinket", "rarity": "uncommon", "classTags": ["heavy", "roman"], "stats": { "damage": 2, "maxHp": -2 }, "description": "The sacred mushroom of the berserkers. Grants fury at a cost." },
  "huntsmans_arrow": { "id": "huntsmans_arrow", "name": "Huntsman's Arrow", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 3 }, "special": "Attacks can target any row.", "description": "An arrow pulled from a Roman shield. It flew true from impossible distance." },

  // --- Difficulty 3+ unique drops ---
  "hound_collar": { "id": "hound_collar", "name": "War Hound Collar", "slot": "trinket", "rarity": "uncommon", "classTags": ["heavy", "command"], "stats": { "damage": 1, "maxHp": 3 }, "description": "A spiked collar from a war hound. Wearing it feels wrong, but it toughens the spirit." },
  "mire_mothers_tusk": { "id": "mire_mothers_tusk", "name": "Mire Mother's Tusk", "slot": "weapon", "rarity": "rare", "classTags": ["heavy"], "stats": { "damage": 4, "maxHp": 2 }, "special": "Kills heal the wielder for 3 HP.", "description": "A massive tusk ripped from the Mire Mother. It pulses with feral vitality." },

  // --- Difficulty 4+ unique drops ---
  "cursed_bone_blade": { "id": "cursed_bone_blade", "name": "Cursed Bone Blade", "slot": "weapon", "rarity": "uncommon", "classTags": ["heavy", "command", "support"], "stats": { "damage": 2 }, "description": "A blade carved from human bone. It cuts deep but chills the hand." },
  "bone_speakers_skull": { "id": "bone_speakers_skull", "name": "Bone Speaker's Skull", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "maxHp": 4, "block": 2 }, "special": "Morale decay reduced by 2 per turn.", "description": "The skull of the Bone Speaker. Silencing it silences the dread." }
};
