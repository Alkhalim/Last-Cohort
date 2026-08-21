# Item Proposals — pool expansion for meta-progression waves

Purpose: support the new unlock system with fresh loot. Target: ~1 new item
per boss + ~25 general items. This doc offers **double** — pick and choose.

Notation: **Name** (slot · rarity · tags) — stats — *special* — unlock.
⚙ = needs new engine code. Everything unmarked recombines existing mechanics
(kill triggers, heal/block riders, morale thresholds, start-of-combat
effects, die manipulation, poison riders, conditional damage).

Boss items unlock on **first kill of that boss** (needs a tiny extension:
`unlockKill: "<enemy_id>"` checked against `stats.enemiesKilled` — 5 lines).
They then drop from the GENERAL pool, so the trophy can appear in any run.

---

## Per-boss trophies (pick 1 of 2 each)

**Germanic Warlord (arminius_champion)**
- A1 **Warlord's War-Braid** (trinket · rare · melee) — dmg 3, HP 2 — *Kills grant +4 morale on marches 4+ (echo of his taunts turned against him).* ⚙
- A2 **Broken Chieftain's Torc** (trinket · rare · melee, command) — dmg 2, HP 3 — *Start each combat with +2 damage for the first 2 attacks.*

**Grove Witch (grove_witch)**
- B1 **Witch's Finger Bones** (trinket · rare · support) — poison 2, heal 2 — *Poison you apply also reduces enemy healing by 50% while it lasts.* ⚙
- B2 **Hexwood Effigy** (trinket · rare · support, command) — heal 2, HP 3 — *When an enemy heals, your most wounded soldier heals 2.* ⚙

**The Silent Huntsman (silent_huntsman)**
- C1 **The Huntsman's Hood** (armor · rare · ranged) — HP 4, dmg 2 — *Attacks against full-HP enemies deal +3 damage (the first arrow is silent).*
- C2 **Quiver of Marked Shafts** (trinket · rare · ranged) — dmg 2, HP 2 — *Your first attack each combat marks the target (+20% damage from all).*

**The Mire Mother (mire_mother)**
- D1 **Mire Mother's Caul** (armor · rare · support) — HP 5, heal 2 — *When a soldier drops below 30% HP, they gain 4 block (once each per combat).* ⚙
- D2 **Brood Talisman** (trinket · rare · roman) — HP 4 — *Post-combat healing +3 (the bog keeps its children breathing).* ⚙

**The Bone Speaker (bone_speaker)**
- E1 **Speaker's Jaw** (trinket · rare · command) — block 2, HP 3 — *Enemy morale attacks are reduced by half.* ⚙
- E2 **Chattering Fetish** (trinket · rare · roman) — HP 3, dmg 1 — *When an enemy dies, its neighbors lose 2 block (the bones betray them).* ⚙

**Serpent Shaman (serpent_shaman)**
- F1 **Shed-Skin Wraps** (armor · rare · support, ranged) — HP 4, poison 1 — *The first hit each combat that would poison you fails.* ⚙
- F2 **Serpent-Fang Aspergill** (weapon · rare · support) — heal 2, poison 2 — *Healing skills also apply 1 poison to a random enemy.*

**Leech Mound (leech_mound)**
- G1 **Leech-Jar** (trinket · rare · support) — heal 2, HP 2 — *Transfusion-style: healing skills drain 1 HP from a random enemy.* ⚙
- G2 **Pulsing Nodule** (trinket · rare · melee) — dmg 2, HP 4 — *Attacks against poisoned enemies heal you 1.*

**Ursus Ferox (ursus_ferox)**
- H1 **Pelt of the Great Bear** (armor · rare · melee) — HP 6, block 1 — *While below 50% HP, +2 damage (wounded bears fight harder).*
- H2 **Bear-Claw Necklace** (trinket · rare · melee) — dmg 3, HP 2 — *Your overkill morale bonuses are doubled.* ⚙

**The Fog Weaver (fog_weaver)**
- I1 **Weaver's Veil** (armor · rare · ranged, support) — HP 4, block 2 — *First enemy attack against this soldier each combat misses (the fog remembers you).* ⚙
- I2 **Lantern of True Sight** (trinket · rare · roman) — HP 3, dmg 1 — *Your attacks ignore 2 points of enemy damage-reduction auras.* ⚙

**The Blood Stag (blood_stag)**
- J1 **Antler Crown** (trinket · rare · command) — dmg 2, block 2, HP 2 — *The first kill each combat grants the whole party +1 damage for 2 attacks.*
- J2 **Stag-Blood Draught** (trinket · rare · melee) — dmg 2, HP 3 — *Once per combat, when you'd be downed, heal 6 instead of falling to 0 first.* ⚙

**Corpse of Arminius (story)**
- K1 **Arminius's Deathmask** (trinket · epic · roman) — dmg 3, HP 4 — *Enemies that kill one of your soldiers take 10 damage (his hatred turns on them).* ⚙
- K2 **The Traitor's Signet** (trinket · epic · command) — dmg 2, block 2, HP 3 — *Once per combat, cancel an enemy's telegraphed attack (he knows their plans).* ⚙

**Corpse of Varus (story)**
- L1 **Varus's Broken Gladius** (weapon · epic · melee) — dmg 5, HP 2 — *On your soldier's death, this weapon's holder gains +5 damage for the rest of combat.* ⚙
- L2 **The Last Order** (trinket · epic · command) — block 3, HP 4 — *Each turn the party took no damage, +6 morale (discipline holds).* ⚙

**Spirits of Arminius & Varus (story, post-game)**
- M1 **Twin-Shade Diadem** (trinket · epic · roman) — dmg 2, block 2, HP 4 — *At half HP, this soldier splits their damage taken with the healthiest ally.* ⚙
- M2 **Peace of the Dead** (trinket · epic · support) — heal 3, HP 5 — *Revived and rescued soldiers return at full HP after combat.* ⚙

---

## General pool (pick ~25 of 50)

### Weapons — melee (pick ~3)
1. **Cudgel of the Deserter** (uncommon) — dmg 3 — *+2 damage while morale is below 40 (desperation).*
2. **Boar-Spear** (uncommon) — dmg 2, HP 2 — *+3 damage against beasts (wolves, boars, stags).* ⚙
3. **Notched Spatha** (rare) — dmg 4, HP 1 — *Every kill adds a notch: +1 damage per 5 lifetime kills with it (max +3).* ⚙
4. **Grave-Iron Blade** (rare) — dmg 4 — *Attacks against enemies below 30% HP deal +4 (the merciful stroke).*
5. **Blooded Pilum** (uncommon) — dmg 3 — *First attack each combat pierces block fully.*
6. **Torchbearer's Brand** (rare) — dmg 3, HP 2 — *Attacks burn: target takes 2 damage at the start of its next action.* ⚙

### Weapons — ranged (pick ~3)
7. **Nightjar Bow** (uncommon) — dmg 3 — *+2 damage on the first turn (they never hear the first volley).*
8. **Wasp-Sting Darts** (uncommon) — dmg 2, poison 1 — *Attacks against already-poisoned enemies apply +1 poison.*
9. **Ashwood Longbow** (rare) — dmg 4, HP 1 — *Attacks against back-row enemies pierce 3 block.*
10. **Sling of the Twelfth** (rare) — dmg 3, HP 2 — *Every 4th attack stuns (counts persist between combats).* ⚙
11. **Hawk-Feather Arrows** (rare) — dmg 4 — *Kills refund the die used (once per turn).* ⚙

### Weapons — support/command (pick ~3)
12. **Surgeon's Saw** (uncommon) — heal 2, dmg 1 — *Healing a full-HP ally grants them 3 block instead.* ⚙
13. **Standard of the Wolf** (rare · command) — dmg 2, block 2 — *Skills that grant morale also grant the party 1 block.*
14. **Censer of Bitter Herbs** (rare · support) — heal 3 — *Heals also apply 1 poison to a random enemy (the smoke chokes them).*
15. **Optio's Baton** (uncommon · command) — dmg 2, block 1 — *Your buffs last +1 attack.*
16. **Mercy-Dagger** (rare · support) — heal 2, dmg 2 — *Killing blows heal your most wounded soldier 3.*

### Armor (pick ~6)
17. **Mud-Caked Lorica** (uncommon) — HP 5 — *First poison applied to you each combat is halved.*
18. **Wicker Shield-Backing** (uncommon) — block 2, HP 2 — *Block above 6 doesn't fade between turns (up to 6 carries).* ⚙
19. **Ambusher's Leathers** (uncommon · ranged) — HP 4, dmg 1 — *+1 die on the first turn of ambush combats (never caught sleeping).* ⚙
20. **Vetera Veteran's Plate** (rare · melee) — HP 5, block 2 — *Taking 3+ hits in one turn grants +5 block next turn.* ⚙
21. **Robes of the Field Altar** (rare · support) — HP 4, heal 2 — *Your heals on OTHER soldiers also heal you 1.*
22. **Pack-Mule Harness** (uncommon) — HP 3 — *+1 trinket slot.* ⚙
23. **Cloak of Nettles** (rare) — HP 4, block 1 — *Melee attackers take 2 damage when they hit you.*
24. **Frost-Rimed Mail** (rare) — HP 5, block 2 — *Enemies that hit you are weakened 1 for their next attack.* ⚙
25. **Blackened Segmentata** (epic) — HP 6, block 3, dmg 1 — *Fire, poison, and morale damage reduced 50%.* ⚙
26. **Hide of the White Doe** (epic · support) — HP 5, heal 3 — *Once per combat, fully cleanse one soldier's poison when they'd take 5+ poison damage.* ⚙

### Trinkets — offense (pick ~4)
27. **Whetstone of Noricum** (uncommon) — dmg 2 — *Camp "Sharpen Weapons" gives +1 more damage.* ⚙
28. **Split-Knuckle Dice** (uncommon) — dmg 1, HP 2 — *Once per combat, split one die into two dice of half value.* ⚙
29. **Trophy Rack** (rare) — dmg 2, HP 3 — *+1 damage per boss slain this run (max +3).* ⚙
30. **Red Ochre Paint** (uncommon) — dmg 2, HP 1 — *+2 damage on turn 1 (the warpaint terrifies).*
31. **Eagle-Eye Lens** (rare · ranged) — dmg 3 — *Your attacks can't be reduced below half by auras/reductions.* ⚙
32. **Grinding Ring** (rare) — dmg 2, poison 1 — *Your poison ticks down 1 slower on enemies (lingers).* ⚙

### Trinkets — defense/sustain (pick ~4)
33. **Knotted Rope Belt** (uncommon) — HP 4 — *Heal 2 when your block fully absorbs an attack.*
34. **Ration Hoard** (uncommon) — HP 3 — *Post-combat heal +2.* ⚙
35. **Candle of the Lares** (rare · support) — heal 2, HP 3 — *At turn start, if anyone is below 25% HP, heal them 2.*
36. **Turtle-Shell Amulet** (rare) — block 2, HP 3 — *Start combats with block equal to the march number.*
37. **Bandage Roll of the X Legion** (uncommon · support) — heal 2 — *Revive skills cost 1 less die value.* ⚙
38. **Iron Rations of Germanicus** (rare) — HP 5 — *The first soldier downed each march revives at 75% HP.* ⚙

### Trinkets — morale/dice (pick ~4)
39. **Centurion's Whistle** (uncommon · command) — block 1, HP 2 — *End Turn with 2+ unused dice: +2 morale (discipline).* ⚙
40. **Loaded Tali** (uncommon) — HP 2 — *Your 1s count as 2s (dice minimum 2).* ⚙
41. **Ancestor Mask** (rare) — HP 3, dmg 1 — *Morale losses from enemy attacks are capped at 3.* ⚙
42. **Drummer's Cadence** (rare · command) — block 2, HP 2 — *Every 3rd turn, +1 die.*
43. **Pale Coin of Charon** (rare) — HP -2, dmg 2 — *When a soldier is downed, gain +15 morale (they died well).* ⚙
44. **Legate's Dispatch** (uncommon · command) — HP 3 — *Start each MARCH at +5 morale (not each combat).* ⚙

### Trinkets — poison/exotic (pick ~4)
45. **Bog-Iron Amulet** (uncommon) — poison 2, HP 1 — *Enemies that hit you gain 1 poison (tainted blood).*
46. **Mushroom Pouch** (rare · support) — poison 2, heal 1 — *Poison kills grant the party +3 morale.* ⚙
47. **Viper Queen's Egg** (epic) — poison 3, HP 3 — *Your first poison application each combat is doubled.* ⚙
48. **Tongue of the Lindwurm** (epic) — poison 2, dmg 2, HP 2 — *Enemies at 8+ poison are also weakened 1.* ⚙
49. **Hollow Idol** (rare) — HP 4 — *Curses you carry are 25% weaker (the idol eats misfortune).* ⚙
50. **Vestal Ember** (epic · support) — heal 3, HP 4 — *The first time the party would drop below 20 morale, restore to 40 (the flame does not die).* ⚙

---

### Suggested unlock spread for the picks
- Per-boss trophies: first kill of that boss (needs `unlockKill`, ⚙ tiny).
- ~8 general picks: available from the start (pool freshness for run 1).
- ~9 general picks: `first_boss_kill`.
- ~8 general picks: split between `boss_corpse_arminius` / `boss_corpse_varus` / `boss_spirits_defeated` / flavor achievements (poison kills, flawless, overkill).
