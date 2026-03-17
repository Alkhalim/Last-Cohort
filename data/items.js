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
  "chiefs_spear": { "id": "chiefs_spear", "name": "Chieftain's Spear", "slot": "weapon", "rarity": "rare", "classTags": ["heavy"], "stats": { "damage": 4 }, "description": "Ash-hafted and iron-tipped. Taken from a war chief." },
  "marsh_fang": { "id": "marsh_fang", "name": "Marsh Fang", "slot": "trinket", "rarity": "rare", "classTags": ["support"], "stats": { "heal": 2, "maxHp": 3 }, "description": "A hollowed fang filled with dark salve. Potent medicine." },
  "runic_stone": { "id": "runic_stone", "name": "Runic Stone", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "extraDice": 1 }, "description": "A stone carved with strange runes. It hums faintly. (+1 die per turn)" },
  "scouts_sling": { "id": "scouts_sling", "name": "Scout's Sling", "slot": "weapon", "rarity": "uncommon", "classTags": ["support"], "stats": { "damage": 2 }, "description": "A well-worn sling. Even the surgeon can fight." },
  "champions_helm": { "id": "champions_helm", "name": "Champion's Helm", "slot": "armor", "rarity": "rare", "classTags": ["heavy", "command"], "stats": { "maxHp": 6, "block": 2 }, "description": "A heavy iron helm ripped from the champion. It reeks of blood." },
  "arm_ring_of_arminius": { "id": "arm_ring_of_arminius", "name": "Arm Ring of Arminius", "slot": "trinket", "rarity": "rare", "classTags": ["roman"], "stats": { "damage": 2, "maxHp": 3 }, "description": "A gold arm ring inscribed with Germanic runes. Power radiates from it." },
  "warlords_blade": { "id": "warlords_blade", "name": "Warlord's Blade", "slot": "weapon", "rarity": "rare", "classTags": ["heavy"], "stats": { "damage": 5 }, "description": "A massive iron sword. Only the strongest can wield it." }
};
