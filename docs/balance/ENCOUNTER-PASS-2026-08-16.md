may# Encounter & enemy balance pass — progression, scaling, variety

**Date:** 2026-08-16
**Method:** fresh runs of `node tools/balance-sim.js` (sections 1, 3, 6) on the current
data, plus targeted re-measurements at n=80 per cell (scratchpad script mirroring
`buildParty`) where the report's n=10–24 cells were too noisy, plus a static analysis of
the encounter tables against the *real* pool-selection rules in `map.js`/`data.js`.

Supersedes the per-boss numbers in `FINDINGS.md` (2026-08-13); the two balance commits
since then (cd3e50d, 0702a8e) changed the landscape substantially.

---

## 0. What the two previous passes achieved

The three melee-hardcounter bosses are fixed. No boss or normal encounter is unwinnable
anymore. At n=80, previous "outliers" mostly dissolve into sampling noise:

| flagged cell | report (n≤24) | re-measured (n=80) | verdict |
|---|---|---|---|
| Ursus Ferox @ m5 | 50% | **70%** | in band, no action |
| Germanic Warlord @ m8 | 50% | **58%** | fine — hardest random boss late, acceptable |
| Corpse of Varus @ m6 | 100% | **81%** | genuinely soft — see F2 |
| The Burning Effigy @ m1 | 23% (pre-pass) | **99%** | fixed by the wicker_man aura cut alone |
| Heart Guardians @ m8 | 50% | **69%** | hard but fair — appropriate as hardest content |
| Dead Legion @ m7 | 0% → 80% | **80%** | fixed |

Note: the commit message for 0702a8e claims "Burning Effigy → minDifficulty 3" but that
edit never landed (only the aura cut did). Measured at 94–99% on marches 1–3 anyway, so
**no data change is needed** — but the commit record is inaccurate.

---

## 1. How the game actually selects encounters (load-bearing for everything below)

- `threat = min(3, baseThreat + difficulty − 1)` (`map.js:59`). Therefore:
  - **`easy` pool: march 1 only.** **`mid` pool: march 2 only** (plus march-1 threat-2
    nodes). **`hard` pool serves every normal fight from march 3 to 8**, filtered by
    min/maxDifficulty.
- Depth-0 and depth-1 fights come from the curated `marchIntroEncounters` /
  `marchSecondEncounters` tables.
- **Story bosses are forced**: m4 = Corpse of Arminius, m6 = Corpse of Varus,
  m8 = Spirits of Arminius & Varus (`map.js:323`). They are **excluded from the random
  pool**, so each is only ever fought at its forced march. Random bosses appear at
  marches 1, 2, 3, 5, 7 with no-repeat tracking across the run.

Consequence for tooling: `balance-sim.js`'s `encountersFor()` still maps diff 3–5 → mid
pool — the real game serves hard there. I re-measured the hard pool at marches 3–5
directly: **every cell is 98–100%**, so the difficulty-curve *conclusion* stands, but the
sim should be fixed before it's trusted for per-cell work at marches 3–5 (see §5).

## 2. The difficulty curve: still flat, then a cliff at march 7

March completion (6 combats + boss), fresh run:

```
march 1   99%
march 3   90%
march 5   78%
march 7   22%   (62% of parties wipe BEFORE the boss, dying around fight 3–4)
```

Per-encounter win rates at n=80 confirm where the cliff comes from. Marches 3–6 normals
are all 95–100% (march-6 pool: 95–100% across all seven entries). At march 7 the pool
suddenly contains six cells in the 59–80% band (Rotting Core 65%, Heart Guardians 66%,
Elder's Court 68%, Dead Legion 80%, Threshold Guardians 80%, Woven Doom 80%) — and
attrition across 6–7 fights compounds that into a 22% march.

Three causes stack at exactly march 7:

1. **The undead wave enters whole**: 9 enemies have `minDifficulty: 7` and nothing new
   arrives at 6. March 6 is the thinnest pool in the game (7 encounters) built from
   march-5 leftovers; march 7 is 18 encounters full of new, stronger enemies.
2. **Additive poison scaling crosses a threshold.** Actions scale
   `poisonTarget + (difficulty − 1)` (`combat.js:294`) while damage scales
   ×(1 + 0.35·(d−1)). A 2-poison thorn arrow is 8 poison at march 7 — ~21 realised
   damage in a 3-turn fight, ~36 if it runs longer, against ~60–75 HP soldiers. The
   0702a8e pass made *base* values readable, but the scaler silently rebuilds the old
   values late. 72% of march-7-8 encounters apply poison.
3. **Fights are too short to recover in**: parties die in 3.2–3.7 turns. It is burst,
   not attrition.

### Suggested changes (in order of leverage)

**F1 — soften the poison scaler.** Change `poisonTarget + diffBonus` to
`poisonTarget + Math.ceil(diffBonus / 2)` (march 7: +3 instead of +6; march 8: +4
instead of +7). This is one line, it is invisible at marches 1–3, and it hits
precisely the mechanic that saturates the late pool. Because poison damage is
quadratic, this roughly halves late-game poison damage. Re-run the march section
afterwards; expect march-7 completion to land in the 30s. If it overshoots past ~45%,
partially revert toward `0.75 · diffBonus`.

**F2 — retune the story-boss ladder at their forced marches only.** Currently
m4 Arminius **74%** → m6 Varus **81%** → m8 Spirits **64%**: the middle story beat is
the easiest, and Varus is easier than the random bosses on either side of him (m5
hardest: 70–71%, m7 hardest: 58–63%). Varus's fight is long (8.4 turns) but harmless.
Target a descending ladder: m4 ≈ 75%, m6 ≈ 65%, m8 ≈ 55–60%. For Varus prefer raising
pressure over HP — his 17-damage Commander's Lash chance 0.3 → 0.35 and Shield
Formation 6 → 7, then re-measure at n≥80. (His other sim cells are unreachable in the
real game; ignore them when tuning, and teach the tuner the forced-march rule.)

**F3 — bridge march 6 (see also variety, §4).** Give part of the march-7 wave
`minDifficulty: 6` so the wave previews before it lands whole: `hollow_legionary`,
`forest_wraith`, and "The Haunted Trail" (the gentlest march-7 encounter) are the
natural candidates. This simultaneously thickens the march-6 pool and turns the
6→7 wall into a two-step ramp.

**F4 — decide the early game explicitly.** Marches 1–5 are a 78–100% cruise; 0702a8e
already measured that adding enemies doesn't move marches 1–2. The honest options are
(a) accept marches 1–3 as the tutorial ramp and shorten them — `maxMidDepth = 5` (or
fewer combat-type nodes) for difficulty ≤ 3, which is what the playtest's "marches are
too long" feedback actually asked for; or (b) leave as is. Injecting difficulty there
has been tried and doesn't work; length is the only real lever. I recommend (a).

## 3. Bosses: in band, with the right hard tail

Reachable boss cells (random pool at 1/2/3/5/7, story at 4/6/8), current data:

```
march 1   Warlord 96, Grove Witch 96                       (tutorial-soft: fine)
march 2   Warlord 79, Grove Witch 83, Huntsman 96, Serpent 92
march 3   Warlord 71, Ursus 71, Mire Mother 75, Serpent 79, Huntsman 92, Grove Witch 96
march 4   Corpse of Arminius 74                            (story)
march 5   Ursus 70, Huntsman/Warlord 71, Fog Weaver 74, Leech Mound 79, GW/BS/BStag 83, MM 88, Serpent 92
march 6   Corpse of Varus 81                               (story — too soft, F2)
march 7   Ursus 58, Warlord 63, GW/MM/BStag 71, Bone Speaker 79, Serpent/Huntsman 83, Leech 92, FW 96
march 8   Spirits of Arminius & Varus 64                   (story)
```

This is broadly healthy — a 20–30-point within-march spread means the boss draw sets
the run's texture, which is roguelite-appropriate. Two soft notes besides F2:

- **Fog Weaver (96%) and Leech Mound (92%) at march 7** are the pushover draws late.
  Their kits scale worst into high player damage (illusions and adds die instantly).
  Low priority, but if touched: scale Fog Weaver's illusion count or Hex frequency with
  difficulty rather than stats.
- march-1's boss pool is just Warlord/Grove Witch at 96% each — fine as a tutorial,
  but see variety note V4.

## 4. Variety audit

### V1 — March 6 is the repetition hole
7 normal encounters (every other march: 12–26). A march-6 run has ~6 normal fights plus
curated intro/second — a player sees most of the pool every single run, right before
the march-7 difficulty wall. Fixes, cheapest first:
- Extend `maxDifficulty` 5 → 6 on: Forest Fortress, Root Guardians, The Old Growth,
  Plague Pit, Bone Court, Swamp Ambush (+6 encounters at no design cost; they measure
  95–100% at m5 and enemy scaling carries them).
- F3's minDifficulty-6 undead preview adds 1–3 more.

### V2 — Five mid-pool encounters are unreachable (dead content)
`mid` is only drawn at marches ≤ 2, but these have minDifficulty ≥ 3: **War Hound
Pack, Runed Shield Line, Cursed Patrol, Ironbound Vanguard, Boar Stampede.** They can
never appear. Move them to `hard` (suggested maxDifficulty 5–6 so they also help V1),
or delete them. Same for `marchIntroEncounters`/`marchSecondEncounters` keys "9" and
"10" — there are only 8 marches; fold those six curated encounters into the 7/8 tables
or drop them.

### V3 — Mechanic saturation: most fights teach the same lesson
Share of normal encounters containing each mechanic (march 3 / 5 / 7):

```
morale chip        87% / 75% / 72%      backline caster   87% / 92% / 78%
aoe                80% / 75% / 83%      poison            33% / 50% / 72%
team-block         33% / 42% / 50%      spawn              7% /  0% / 11%
dice-attack         7% /  0% /  0%      heal (druids)      0% /  0% / 28%
```

The modal encounter at every march is "melee line + back-row caster chipping morale" —
the dominant strategy is always *kill the backline first*. The distinct archetypes that
force different play exist but are one-offs:

- **dice-attack** (runecarver, fate_weaver): 1 encounter at m3–4, none at 5–7, 3 at m8.
- **block-to-damage** (ironbound_champion): marches 3–4 only, and its better version
  (Ironbound Vanguard) is dead content (V2).
- **spawn/swarm pressure**: leeches at marches 1–2, then nothing until hollow_centurion
  at 7. The mid-game never fights a swarm.
- **healer-priority** (blood_druid): good, but confined to 6–8.
- **enrage/execute-order tension** (berserker, wounded-double-attack): spread thin.

Suggestion: aim for every march to serve at least 2 encounters each from ~4 distinct
strategy families (kill-priority, anti-turtle, swarm, resource-attack). Concretely:
give runecarver or fate_weaver a mid-game encounter (runecarver's maxDifficulty
already allows it — it's just not in any 5–6 encounter), move a leech/spawn encounter
into 4–6 (Leech Swarm variant with plague_bearers), and put one ironbound-style
block-charge encounter at 6–7 (Ironbound Vanguard fits exactly).

### V4 — Boss variety is genuinely strong; entry is the weak point
13 bosses with distinct mechanical identities (totem-heal, add-merge, summoner-backline,
poison-sustain, block-stacking cubs, illusion+dice, retreat-heal, mark-sniper,
spawn-queen, skill-copy, linked pair) and no-repeat tracking across a run. The weak
spot is march 1–2: pools of 2 and 4 mean every run opens against Warlord or Grove
Witch. Cheapest fix: drop Silent Huntsman and Serpent Shaman's encounter
`minDifficulty` from 2 → 1 (both are 92–96% at march 2 and would be tutorial-safe at 1,
verify with one sim cell each).

### V5 — Poison saturation narrows late-game strategy
72–73% of march-6–8 encounters apply poison while 7 of 13 classes still have no
cleanse (still open from the previous plan's B2 options). F1 (softer scaler) treats the
symptom globally; the roster fix (one baseline anti-poison option per class, or Block
reducing poison application) remains the durable answer if poison teams should stay a
distinct *enemy* archetype rather than the default late-game texture.

## 5. Tooling corrections (do before the next pass)

1. `balance-sim.js encountersFor()` — mirror the real rule: easy only at diff 1,
   mid at diff ≤ 2, hard at diff ≥ 3 (with min/max filters). Currently marches 3–5
   are measured against a pool the player never sees.
2. Teach the boss sections that story bosses only occur at their forced march; today
   they pollute the "out of line" flags with unreachable cells.
3. Raise normal-encounter reps from 10 to ≥40 (bosses 24 → ≥60). Half of this pass was
   chasing n=10 ghosts: Heart Guardians "50%" was 69%, Ursus "50%" was 70%.

## Not doing / unchanged

- Class spread is unchanged (cataphract 73.9% → signifer 53.8%, same bottom four:
  signifer, medicus, sagittarius, arcania). That's plan items B5/B7, not this pass.
- Item rarity budget (B6) untouched.
- Morale: bands were rescaled (50 = STEADY, floor 0 = SHAKEN) which defuses the old
  death spiral; decay still grows per turn, which still punishes long fights. Watch it
  after F1 — longer poison-light fights will drain more morale.

## Suggested sequencing

1. **F1** poison scaler (one line) → re-run march + encounters sections.
2. **V1 + V2 + F3** pool surgery (pure data: maxDifficulty extensions, moving dead
   encounters, minDifficulty-6 preview) → re-run march 6/7 cells.
3. **F2** story-boss ladder with the solver, forced marches only.
4. **F4** early-march length decision.
5. **V3/V4** variety additions.

---

# Follow-up pass (same day): the march-numbering discovery, march-6 roster, poison diet

## 6. The encounter tables still use the old 10-march numbering

`MARCH_THEMES` (`js/main.js:48`) names the eight marches. Checking every intro table
and enemy wave against it shows the content is offset — it was authored for a 10-march
run and only partially renumbered when the game was compressed to 8:

| march | theme table | what the tables actually serve | belongs to theme |
|---|---|---|---|
| 3 | The Poisoned Bog | warcamp (ironbound, shield walls) | ~march 2 |
| 4 | The Old Forest | bog (leeches, plague, stalkers) | march 3 |
| 5 | The Blood Grove | old forest (wardens, ravens) | march 4 |
| 6 | **The Haunted March** ("the dead walk in Roman formation") | blood grove (druids, altars, boars) | march 5 |
| 7 | Heart of the Forest | haunted (hollow Romans) **and** heart (rot, heartwood) | march 6 + 7 |
| 8 | The Threshold | drowned ruins (a cut march) + threshold | (cut) + 8 |
| "9"/"10" | *(no such marches)* | heart / threshold intros | march 7 / 8 |

The heart (minDiff 7) and threshold (minDiff 8) *enemy* waves were renumbered
correctly; the bog→haunted band (minDiff 4/5/6/7) was not, and the intro tables were
never touched. This one offset explains three separate findings at once: the march-6
pool starvation (its native wave is filed under 7), the 6→7 cliff (two themed waves
enter at 7 together), and the dead 9/10 tables.

**R1 — Realign instead of inventing filler.** Data-only changes:

- Enemy/encounter `minDifficulty`: bog wave 4→3 (`plague_bearer`, `shadow_stalker` and
  their encounters), old-forest wave 5→4 (`warden_of_the_deep`, `raven_caller`),
  blood wave 6→5 (`blood_druid`, `ironhide_boar` + Blood Circle/Altar Guard/Ritual
  Warband/Iron Stampede), haunted wave 7→6 (`hollow_legionary`, `hollow_centurion`,
  `hollow_equites`, `forest_wraith` + their encounters). Heart (7) and threshold (8)
  stay.
- Intro/second tables shift down one: current 4→3, 5→4, 6→5, 7→6, then 9→7, 10→8.
  Current "3" (warcamp — duplicates march 2's theme) and current "8" (drowned ruins —
  the cut march) become spares; the drowned encounters (Flooded Gate, Sunken Court,
  Drowned Wardens, Warden's Stand) can stay in the march-8 *random* pool as
  threshold-adjacent ruins, or be retired.
- Each wave arriving one march earlier means facing a weaker party — after the shift,
  run `tune-encounters.js` over marches 3–6. Headroom exists (everything before 7 is
  95–100% today), and this doubles as the "raise early threat" lever that the old plan
  wanted (B3) but couldn't find.

## 7. March 6 rebuilt as The Haunted March — 9 encounters, measured

All haunted-native (hollow Romans, wiedergangr, cursed dead, wraiths, carrion ravens,
skeletons, seers who speak to the dead). Win rates at difficulty 6, n=80, current
scaling:

**Moved from minDifficulty 7 → 6** (they also remain in the 7–8 pools):

| encounter | comp | m6 win% | role |
|---|---|---|---|
| The Haunted Trail | wraith + 2 hollow_legionary | 99% | breather / intro-tier |
| The Fallen Century | centurion + 3 legionaries | 93% | turtle-break, formation fantasy |
| Cavalry Ghost | 2 equites + legionary + wraith | 85% | tempo / phase-shift chargers |
| Dead Legion | wiedergangr + 3 cursed | 74% | the march's hard cell |

**New compositions** (Dragon's-Lair enemies stay lair-exclusive per design decision
2026-08-17 — no clinking_bones here; all measured at n=80):

| encounter | comp | m6 win% | role |
|---|---|---|---|
| The Broken Standard | centurion + legionary + 2 cursed | 99% | kill-priority + turtle |
| The Last Muster | 2 centurions + 2 legionaries | **89%** (6.4t) | double Rally the Fallen — spawn pressure + formation |
| Carrion Watch | 2 raven_caller + legionary + wraith | 96% | backline morale pressure |
| Grave Escort | 2 equites + cursed + bog_seer | 98% | phase-shift tempo line |
| Procession of the Dead | 3 cursed + bog_seer | 100% (2.5t) | breather / body swarm (tuner candidate) |

If a true *fast*-swarm archetype is wanted at march 6, it needs one small NEW enemy —
a "Restless Dead" (grasping half-risen dead of Teutoburg; fast, fragile,
wounded-double-attack, same mechanical template as the lair skeleton but its own
identity and art). Optional; the roster above works without it.

**The unused mid-pool five, honestly assessed for march 6:** only Cursed Patrol fits
the haunted theme, and it needs a fourth unit (measured 100% / 1.7 turns as-is — too
thin at 5–6; add a forest_wraith). The other four belong earlier, where they thicken
the thin 3–5 pools instead: War Hound Pack → hard 3–5, Runed Shield Line → hard 2–4,
Ironbound Vanguard → hard 3–5, Boar Stampede → hard 3–5 (blood-grove adjacent).
Nothing gets deleted; everything gets a reachable home.

## 8. Third march-1 boss

**Silent Huntsman `minDifficulty` 2 → 1** (encounter + enemy). Measured **100% at
march 1** (n=80, 4.2 turns) — tutorial-safe, no nerf needed, and the theme is exact:
march 1 is "The Ambush Trail" and he is the ambush sniper, teaching mark/focus-fire
before the game gets serious. Serpent Shaman should *not* come down to 1 — poison
belongs to the bog (march 3) and his kit is rougher on new players.

## 9. Poison diet: 72% → ~60%, via intuition rather than quotas

Audit of every poison source — does the poison *read* as poison?

| enemy | poison flavor | verdict |
|---|---|---|
| fen_viper, serpent_shaman/shade | venom | keep — definitional |
| mire_leech + mounds | infected bites, bile | keep |
| plague_bearer, rot_spawn | plague, spores | keep — definitional |
| cursed_warrior | black-veined curse-rot | keep — it IS the haunted poison carrier |
| dryad_huntress | "arrows laced with the forest's venom" | keep — heart-of-forest identity |
| bone_speaker, blood_stag, spirit_of_arminius | curse / cursed wounds | keep — boss spice |
| blood_druid (Hemorrhage) | blood-magic bleeding | keep — cutting it would overshoot to ~44% |
| **war_hound** (Hamstring) | "festering wound" | **cut** — hounds are a speed/pack threat; poison is a stretch. Hamstring → `weakenTarget: 1` (hamstrung = weaker) |
| **runecarver** (Curse Rune) | rune curse | **cut** — his identity is dice + wards; keep the −4 morale, drop the poison |
| **elder_seer** (Curse of Weakness) | "forgets how to fight" | **cut** — her own description says weaken, not venom. → `weakenTarget: 2`; she stays the morale queen |
| wicker_man (Ember Spit) | burning embers | keep mechanically, reword text toward smoke/choking (it's the only "burn-as-poison"; marches 1–5 only, low stakes) |

Plus one encounter edit: **The Officer's Grave**: dryad_huntress → forest_wraith (a
huntress "driving" an undead Roman command was already a theme stretch; a wraith is
the natural handler and removes an off-theme poison source).

Resulting poison share of normal encounters (current pools): **march 7: 13/18 → 11/18
= 61%. March 8: 19/26 → 16/26 = 62%.** Realigned march 6 lands near ~35% naturally,
since the haunted wave's only poison carrier is cursed_warrior — poison concentration
then peaks where it is thematic: the bog (3) and the rotting heart (7). These cuts
stack with F1 (softer scaler); do F1 first, re-measure, then apply these — together
they may overshoot, in which case keep the cuts (readability) and relax F1 to
`0.75 · diffBonus`.

## 10. "Two encounters per strategy family per march" — gap map

Families: **A** kill-priority backline · **B** turtle-break (block/auras) · **C**
swarm/spawn · **D** burst race (assassins/enrage) · **E** resource attack
(dice/weaken/heavy morale).

| march | A | B | C | D | E | gaps → fix |
|---|---|---|---|---|---|---|
| 1 | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓✓ | D thin: fine for a tutorial |
| 2 | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓✓ | — |
| 3 | ✓✓ | ✓✓✓ | ✓✓ | ✓✓ | ✓ | E → Runed Shield Line rehomed (hard 2–4) |
| 4 | ✓✓ | ✓✓ | ✓ | ✓✓ | ✓ | C → Boar Stampede rehomed (hard 3–5); B → Ironbound Vanguard (3–5) |
| 5 | ✓✓ | ✓✓✓ | ✗ | ✓ | ✓ | C+D → War Hound Pack + Boar Stampede (3–5) |
| 6 now | ✓ | ✓ | ✗ | ✓ | ✓ | *everything thin* — fixed wholesale by §7 (A✓✓ B✓✓ C✓✓ D✓✓ E✓✓) |
| 7 | ✓✓ | ✓✓ | ✓ | ✓✓ | ✗ | E → move Threshold Guardians (fate_weaver) minDiff 8→7, or add a rune-binding action to an m7 enemy |
| 8 | ✓✓ | ✓✓ | ✓✓ | ✓✓ | ✓✓ | — |

Everything above is data-only except the two `weakenTarget` swaps. Suggested order:
R1 realignment → §7 march-6 roster → solver pass over 3–6 → poison diet (§9) after F1
is measured.

---

# Run-structure proposal (2026-08-17): six marches, randomized route

## 11. The eight current marches, and where the water march went

`MARCH_THEMES` (`js/main.js:48`): **1** The Ambush Trail · **2** The Hunting Grounds ·
**3** The Poisoned Bog · **4** The Old Forest · **5** The Blood Grove · **6** The
Haunted March · **7** The Heart of the Forest · **8** The Threshold. Plus the hidden
Dragon's Lair (event-gated, difficulty 8, exclusive roster).

The cut **water/drowned march** survives in pieces: its intro tables sit under the
dead key "8" of the old 10-march numbering (Flooded Gate, Drowned Legion, Seer's
Court, Sunken Patrol, Warden's Flood, Drowned Officers), its hard-pool encounters
(Sunken Court, Drowned Wardens, Warden's Stand) run at march 8, and its signature
enemy `warden_of_the_deep` leaks across marches 5–8 as a generic tough front-liner.
The warden reads fine in bog/old-forest contexts (still black pools), but the
explicitly *flooded-ruins* encounters have no home region — they presume a location
the theme table no longer contains. Verdict: the enemies travel fine, the drowned
*encounters* deserve their region back (see below) or a reflavor.

## 12. Six marches per run, route randomized past the tutorial

Structure — "slot" is position in the run and drives all stat scaling; "region" is
the theme and drives the encounter pool:

| slot | region choice | boss |
|---|---|---|
| 1 | **The Ambush Trail** (fixed tutorial) | random: Warlord / Grove Witch / Silent Huntsman (§8) |
| 2 | pick 1 of 2: **Hunting Grounds** / **Poisoned Bog** | random pool |
| 3 | pick 1 of 3: **Old Forest** / **Blood Grove** / **The Drowned Vale** (revived water march) | random pool |
| 4 | pick 1 of the 2 remaining from slot 3's pool | **Corpse of Arminius** (story, forced) |
| 5 | pick 1 of 2: **Haunted March** / **Heart of the Forest** | **Corpse of Varus** (story, forced) |
| 6 | **The Threshold** (fixed finale) | **Spirits of Arminius & Varus** |

- **24 distinct routes**; every run skips one early, one mid, and one late region.
  Track recently-played regions like `recentBosses` so consecutive runs diverge.
- **The Drowned Vale** costs almost nothing: intro/second tables exist (the dead "8"
  key), three hard encounters exist, roster = warden_of_the_deep + mire_leech +
  plague_bearer + hollow drowned Romans. It needs only a theme entry, music, and a
  boss (candidate: promote the Warden into a "Warden of the Depths" boss variant, or
  reuse Leech Mound as its native boss — both are water creatures).
- **Story arc survives**: Arminius mid-run, Varus late, Spirits finale — same beats,
  now at slots 4/5/6. Their intros are already region-agnostic ("claws from the
  battlefield mud", "a spectral figure materializes").
- **Scaling decouples from content**: encounters get a `region` tag; the difficulty
  number becomes the slot (1–6). Retune per-step constants so slot 6 lands near old
  march-8 power: HP step 0.65 → ~0.9, damage step 0.35 → ~0.5, poison step halved
  per F1. Progression must compress equally: item budget/levels ~33% richer per
  march (itemLevel 0.4·d → 0.55·slot, epics from slot 5), or end-of-run power drops.
- **Supersedes R1**: if this lands, don't do the §6 renumbering — the region tag
  replaces minDifficulty gating outright. R1 stays the cheap fallback if the game
  keeps 8 fixed marches.
- Everything needs one `tune-encounters.js` pass over slots 2–6 afterwards; the
  6-slot compression makes each step steeper, so expect a handful of encounters to
  need the solver's multiplier.

## 13. IMPLEMENTED (2026-08-17) — with an amended final-boss design

The §12 structure is in the game, with one design change decided by the owner:
**story bosses are never forced mid-run.** All three belong to the final march
(slot 6, The Threshold) as a rotation gated by meta-progression: only the Corpse
of Arminius can appear until he has been beaten at least once; then the Corpse of
Varus joins the rotation; once Varus falls, the Spirits join. The rotation grows —
earlier bosses stay in it. Slots 1–5 draw from the regular pool only.

What landed:
- `js/data.js`: `FINAL_MARCH = 6`, `REGIONS` (9 regions incl. the revived
  **Drowned Vale**), `generateRoute()` (fixed bookends, randomized middle, biased
  toward last run's skipped regions), `generateEncounterForRegion()`,
  `contentToSlotGate()` (old 8-scale → slot gates), and a load-time remap of item
  and drop-tier gates onto the 6-slot scale. Encounter/enemy/event gates keep the
  old numbers as *content keys* that regions translate.
- `js/map.js`: region-driven intro/second tables and pools; events filter on the
  region's contentDiff; final-march story rotation; slot-gated random boss pool;
  `isFinalMarch` at slot 6.
- `js/combat.js`: scaling retuned so slot 6 ≈ old march 8 — HP step 0.65/0.55 →
  **0.9**, damage 0.35 → **0.5**, heals 0.25 → **0.35**. Poison stays `+diffBonus`,
  which now maxes at +5 instead of +7 (a built-in late-poison soften).
- `js/main.js`: route generation/persistence (with save-migration for old saves),
  region-based themes, unlock ladder remapped (Signifer 2, Equites 4,
  Ballistarius 5, Vestalis 6), test-run scaler at 8/6 of the old per-march rates,
  test entries re-slotted (Barrow 3, Thusnelda 4, Dragon's Lair 6).
- `js/ui.js`: run victory = final-march boss defeated (any of the three), per-boss
  ending text, and a teaser line while deeper bosses remain locked.
- The §7 haunted encounters are in `data/gamedata.js`; Silent Huntsman is a
  march-1 boss (third opener, measured 100% there).

Measured rotation at slot 6, n=100, party at the retuned test-scaler power:

| final boss | win% | turns |
|---|---|---|
| Corpse of Arminius (first unlock) | 64% | 4.9 |
| Corpse of Varus (after Lash 17→18 @0.4, Rally 0.25, Shame 0.15) | 66% | 7.4 |
| Spirits (Phantom Blade 10→12, Death's Verdict 14→16) | **52%** | 4.3 |

Pool spot-checks: threshold slot 6: 73–98%; haunted/heart slot 5: 65–98%;
drowned slots 3–4: 95–100%; early slots unchanged (~100%). 108 regression tests
pass, including 8 new ones covering route invariants, pool resolution, the
rotation gating, and story-boss exclusion from slots 1–5.

Still open after this change:
- `tools/balance-sim.js` / `tune-encounters.js` still assume the 8-march scale
  and the old pool mapping — realign before the next tuning pass.
- Progression pacing (XP cadence, loot volume per march) has only the test-scaler
  retune; real-run pacing needs a play-through check.
- The poison-intuition diet (§9) and remaining variety moves (§10) are unapplied.
- `MARCH_THEMES` in main.js is now a fallback only; remove once nothing references
  it.
