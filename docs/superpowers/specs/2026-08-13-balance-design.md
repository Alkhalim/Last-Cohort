# Balance Plan

**Date:** 2026-08-13
**Evidence:** `docs/balance/FINDINGS.md`, raw output `docs/balance/report.txt`
**Supersedes:** Phase 3 of `2026-08-12-playtest-feedback-design.md`

Every change below is followed by the measurement that should confirm it. The simulator
(`node tools/balance-sim.js`) can re-run any section, so each item is falsifiable.

Ordered by impact. B1 is the largest single lever and everything else is easier to judge
once it lands.

---

## B1 — Morale is a death spiral, not a resource (highest impact)

**Evidence.** Morale decays by `turn + diffDecay` every player turn
(`js/combat.js:3841-3847`). Simulated trajectory from the starting 50:

| march | diffDecay | morale after turns 1–6 |
|---|---|---|
| 1 | 0 | 49 → 47 → 44 → 40 → 35 → 29 |
| 5 | 4 | 45 → 39 → 32 → 24 → 15 → **5** |
| 7 | 5 | 44 → 37 → 29 → 20 → 10 → **0** |

Measured across a real march-7 run, morale went 50 → 47 → **4** within two fights and
stayed at 0 for the rest of the march.

Three consequences compound:

1. **The neutral band is unreachable.** "Steady" (no modifiers) starts at 55, but runs
   start at 50. Players begin in "Shaken" and only ever go down. The positive bands
   (Confident 70+, Inspired 85+) are effectively boss-reward-only.
2. **Late marches are permanently debuffed.** Morale 0 is "Broken": −2 damage,
   −2 healing, and 2 damage to a random ally every turn. From march 5 onward the party
   spends most of every fight in a penalty band, and takes chip damage for it.
3. **Morale-keyed content is dead.** The Signifer's defining passive ("+1 die while
   morale is 60+") can never fire — 60 is above the starting value. Corona
   Obsidionalis ("while morale is above 70") is in the same position.

**Change.**
- Raise starting morale from 50 to **60**, so runs begin in Steady with headroom into
  Confident, and morale-gated content becomes reachable.
- Flatten the decay: replace `turn + diffDecay` with a **constant per-march rate**
  (`2 + floor(difficulty / 2)`, so 2 at march 1 and 6 at march 8). The current formula
  scales with turn count, which punishes exactly the long fights that the rest of the
  design creates.
- Raise the floor from 0 to **10** during combat, so a bad fight is a penalty rather
  than an unrecoverable state.

**Verify.** Re-run `--section march`. Expect march-7 completion to rise from 14% and
the march-6/7/8 curve (91/85/80%) to flatten. If completion overshoots past ~40% at
march 7, pull the decay constant back before touching anything else — several later
items assume the late game still bites.

---

## B2 — Two bosses are far out of line

**Evidence.** Win rate against the average for their march, every march they appear at:

| boss | m4 | m5 | m6 | m7 | m8 | march avg |
|---|---|---|---|---|---|---|
| **The Leech Mound** | 17% | 25% | 21% | 29% | 33% | 76–82% |
| **The Bone Speaker** | 33% | 33% | 38% | 42% | 42% | 76–82% |

Both sit 40–60 points below their march average at *every* difficulty. Not variance.

### B2a — Leech Mound: an uncapped spawn cascade

`leech_mound` casts `Leech Swarm` (20%, no cooldown) to spawn `mire_leech`. But
`mire_leech` itself carries `canSpawn` and its own `Multiply` action (30%) that spawns
*more* leeches (`data/enemies.js`). Spawns spawn spawns — growth is exponential and
unbounded. Every one of them applies poison (Latch On 4, Blood Drain 2, plus
`deathPoison: 2` each), and poison's `N(N+1)/2` curve turns that into very large damage.

**Change.**
- Remove `Multiply` from `mire_leech`, or gate it behind a cooldown of 3+. Spawned
  adds should not themselves spawn.
- Cap total live enemies from a single encounter at 6; suppress further spawns at the
  cap. This protects every spawning boss, not just this one.
- Reduce `Fester` poison from 5 to 3, given the poison stacking already present.

### B2b — Bone Speaker: melee cannot reach it

`bone_speaker` sits in the **back row** and casts `Raise the Dead` (20%) to spawn
`cursed_warrior` into the **front row**. A melee party can only reach the back row once
the front row is empty (`getValidEnemyTargets`, `js/combat.js:1466`) — so a boss that
continuously refills the front row is unreachable by half the roster. On top of that it
has `Soul Shackle` at **17 damage** on a 1-turn cooldown and `Bone Curse` applying
**7 poison** (28 total damage).

**Change.**
- Give `Raise the Dead` a cooldown of 3 so the front line can be cleared.
- Reduce `Soul Shackle` from 17 to 12 — it is the single largest non-boss-passive hit
  in the data.
- Reduce `Bone Curse` poison from 7 to 4.
- Consider moving the Bone Speaker to the front row on a phase shift below 50% HP, the
  way the Grove Witch already retreats. That gives melee a window without weakening the
  fantasy.

### B2c — Too easy at the other end

| boss | result |
|---|---|
| The Silent Huntsman | 96–100% at every march, over in **3.3 turns** |
| Corpse of Varus | 100% at marches 6–8 |
| The Mire Mother | 100% at march 4 |
| **The Grove Witch** | 88–100% — confirms the playtest report |

The Silent Huntsman is a pure damage-dealer with no adds, no block and no healing — 50
base HP and nothing protecting it.

**Change.** Give the Silent Huntsman a defensive mechanic in keeping with its fantasy:
untargetable for one turn after `Mark Prey` (it vanishes into cover), or 30% miss chance
while in the back row. For the Grove Witch, scale her healing-totem output with
difficulty as the plan's earlier draft proposed — her totem heal is
`6 + (difficulty-1)*2` while party damage grows far faster.

**Verify.** Re-run `--section encounters`. Target: no boss more than 20 points from its
march average.

---

## B3 — The difficulty curve is flat for five of eight marches

**Evidence.**

```
march 1-5   100% average encounter win rate
march 6      91%
march 7      85%
march 8      80%
```

Nothing before march 6 threatens a correctly equipped party. This is the strongest
argument for the requested encounter cut — but it also means the cut alone will not
make the early game *interesting*, only shorter.

**Change.**
- Apply the planned `maxMidDepth` 6 → 4 reduction (see B4 for the interaction).
- Raise early-march threat: the `easy` and `mid` threat tiers are used for marches 1–5,
  and their encounters win at 100%. Increase enemy counts or shift the tier boundaries
  so marches 3–5 draw from `hard` more often.

**Verify.** `--section encounters`, difficulty curve block. Target a smooth ramp from
~95% at march 1 to ~75% at march 8, rather than a cliff at 6.

---

## B4 — March length only matters where the game is already hard

**Evidence.** Completion by number of combats before the boss:

| march | 3 | 4 | 5 | 6 (current) | 7 |
|---|---|---|---|---|---|
| 1 | 100% | 100% | 100% | 100% | 100% |
| 3 | 93% | 93% | 96% | 93% | 90% |
| 5 | 80% | 71% | 73% | 78% | 77% |
| 7 | **36%** | 23% | 23% | **14%** | 12% |

At marches 1–5 length barely affects survival — it is purely pacing. At march 7 it
dominates: cutting 6 combats to 3 more than doubles completion.

**Consequence for the planned change.** `maxMidDepth` 6 → 4 will do exactly what the
playtest asked for in the early game (shorter, no easier) but will **substantially ease
marches 7–8**, which are the only marches currently providing challenge.

**Change.** Make the cut, but scale it: keep more combats in the late game.
`maxMidDepth = difficulty >= 7 ? 5 : 4`. Pair with B1 — if the morale spiral is fixed,
late marches can afford to stay long.

Also rescale the threat thresholds keyed to absolute depth, or the shorter march is
silently easier as well as shorter: `js/map.js:51,53`, `:198-199`, `:240-241`, `:253`,
`:494-495`.

**Verify.** `--section march`. Target: completion at march 7 lands between 30% and 45%
after B1 and B4 together.

---

## B5 — Signifer and Medicus are the weak ends of a 20-point class spread

**Evidence.** March completion when the class is on the team, 13 classes, ~100 marches
each: Legionary 72.7% at the top, **Signifer 56.6%** and **Medicus 53.1%** at the
bottom. Both also carry the worst down rates (49% and 53%).

### B5a — Signifer

Its passive requires morale 60+, which B1 makes reachable for the first time. That alone
may fix it, so **make no other Signifer change until B1 has been measured.**

If it is still bottom-two afterwards: it has a single weapon slot (vs the Legionary's
two) and 25 base HP while carrying a mostly-support kit. Raise base HP to 28 before
touching the kit.

### B5b — Medicus

23 HP, one weapon slot, one armour slot, five trinkets — the squishiest frame in the
game, with a 53% down rate. It contributes real value when alive (31 poison damage per
fight) but dies too often to deliver it.

**Change.** Raise base HP 23 → 26, or move one trinket slot to armour. Prefer the slot
change: it keeps the fantasy and lets the player choose survivability.

**Verify.** `--section classes`. Target: spread under 15 points, nothing below 58%.

---

## B6 — Rarity delivers almost no power

**Evidence.** March-7 completion with each item forced onto the party, averaged by tier
over ~750 marches per tier:

```
uncommon   17.8%   rare   19.4%   epic   20.0%     (baseline 19.7%)
```

**2.2 points separates uncommon from epic.** Rarity is currently decorative.

> **Do not act on individual item rankings from the report.** They were measured at 22
> marches each against a ~20% base rate, where noise is ±17 points. Re-testing the
> extremes at n=100 collapsed every one of them to baseline. Only the tier aggregate is
> trustworthy.

**Change.** Define an explicit stat budget per rarity and bring items to it — roughly
common 3 points, uncommon 5, rare 8, epic 12, counting 1 damage = 1 block = 2 maxHp = 1
poison = 1 heal, with `special` effects costed on top. This is a data pass over
`data/items.js`, not a code change.

**Verify.** Re-run `--section items` **with `reps` raised to at least 80** (currently
22 — it is not powerful enough to judge single items). Target: a clear monotonic rise
across tiers, ideally 5+ points from uncommon to epic.

---

## B7 — Poison: correct against bosses, but its compounding never lands

**Evidence.** Team held constant, march 6, 250 fights per cell:

| target | applied | realised | conversion |
|---|---|---|---|
| Boss | 67.9 | 91.3 | **1.35×** |
| Normal | 45.3 | 53.1 | 1.17× |

Poison deals 72% more damage per boss fight — the playtest recollection that poison
teams excel against bosses is **correct**, and the class table hides it by averaging 6
normal fights against 1 boss.

But a stack of N converts at `(N+1)/2` in theory — a stack of 6 should be 3.5×.
Measured is 1.35×. Kits apply poison 3–4 at a time and fights end before large stacks
mature, so the mechanic's whole payoff curve is unreachable.

**Change.** Reward stacking rather than raw application:
- Add a threshold effect — at 8+ poison an enemy takes an extra tick, or poison decays
  by 1 only every *other* turn once above 6. Either makes big stacks qualitatively
  different from small ones.
- Give the poison classes one high-application skill each so a stack can be built in a
  single turn rather than assembled over four.

This is the "synergistic but underpowered" case: the mechanic is well designed, and
nothing in the kits can reach the interesting part of its curve.

**Verify.** Re-run the boss-vs-normal conversion measurement. Target: boss conversion
above 2.0× while normal-encounter conversion stays near 1.2× — poison should be a
boss-killer, not a general-purpose answer.

---

## Sequencing

1. **B1** alone, then re-measure everything. It moves the late-game curve, the class
   table and possibly the Signifer on its own; judging anything else first risks
   fixing symptoms.
2. **B2** boss outliers — independent of B1, safe to do in parallel.
3. **B4 + B3** march length and early threat, together, since they interact.
4. **B5** class tuning, only after B1 is measured.
5. **B7** poison stacking.
6. **B6** item rarity budget — the largest data pass, and the least urgent.

## Not doing

- Individual item buffs or nerfs based on the current report. The measurement is not
  powerful enough; B6 raises the sample count first.
- Skill-level changes from the pick-rate table. The simulated player models 52 of 115
  effect keys, so "never picked" is often the AI's blind spot. That section needs a
  better AI or human judgement before it can drive changes.
