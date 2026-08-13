# Balance findings — simulated

**Date:** 2026-08-13
**Method:** `node tools/balance-sim.js` — the real engine plays real encounters headless.
Nothing below is read off the data files; every number comes from `combat.js` executing.
Full output: `docs/balance/report.txt`.

---

## How to read this

Measurements are taken over **full marches** (6 fights then a boss), not single
encounters. A properly scaled party wins ~97% of individual fights, so single
encounters cannot separate anything — attrition across a march is where power shows.

Party power at each march mirrors `startTestRun()` in `js/main.js`, the project's own
answer to "what does a party look like at march N".

**Read the caveats at the bottom before acting on the skill section.** The rest is solid.

---

## 1. The difficulty curve is flat until march 6

```
march 1-5   100% average encounter win rate
march 6      91%
march 7      85%
march 8      80%
```

Five of the eight marches present essentially no threat to a correctly equipped party.
Everything meaningful happens in the last three.

This reframes the "marches are too long" feedback: at marches 1–5 the length is not
dangerous, it is simply *slow*. Cutting encounters there costs nothing.

## 2. March length only matters where the game is already hard

Completion rate by number of combats before the boss:

| march | 3 combats | 4 | 5 | 6 (current) | 7 |
|-------|-----------|---|---|---|---|
| 1 | 100% | 100% | 100% | 100% | 100% |
| 3 | 93% | 93% | 96% | 93% | 90% |
| 5 | 80% | 71% | 73% | 78% | 77% |
| 7 | **36%** | 23% | 23% | **14%** | 12% |

At marches 1–5 length is nearly irrelevant to survival. At march 7 it dominates:
going from 6 combats to 3 more than doubles completion (14% → 36%), and wipes before
the boss fall from 76% to 50%.

**Implication for the planned change (`maxMidDepth` 6 → 4):** it will barely affect
early marches — it just makes them shorter, which is what was asked for. But it will
*substantially* ease marches 7–8. If the late game is meant to stay punishing, the cut
should be paired with a difficulty increase there, or applied only to early marches.

## 3. Two bosses are far out of line

Win rate against the march average, flagged when more than 20 points out:

| boss | march 4 | 5 | 6 | 7 | 8 | verdict |
|------|---------|---|---|---|---|---------|
| **The Leech Mound** | 17% | 25% | 21% | 29% | 33% | **far too hard everywhere** |
| **The Bone Speaker** | 33% | 33% | 38% | 42% | 42% | **far too hard everywhere** |
| Serpent Shaman | — | — | 46% | — | — | too hard at marches 3 and 6 |
| The Silent Huntsman | 100% | 100% | 100% | 100% | 96% | **too easy, and over in 3.3 turns** |
| The Mire Mother | 100% | — | — | — | — | too easy at march 4 |
| Corpse of Varus | — | — | 100% | 100% | 100% | too easy |

Leech Mound and Bone Speaker sit 40–60 points below their march average at *every*
difficulty they appear at. That is not variance.

**On the Grove Witch:** the playtest report said she "scales a bit weakly — other bosses
seem way more scary". Confirmed: 88–100% win rate across marches 4–8, at the easy end
of the roster. She is not as extreme as the Silent Huntsman, but she is not a threat.

## 4. Class spread is 20 points

March completion when the class is on the team:

```
legionary     72.7%      centurion     64.2%
wulfswestr    71.6%      arcania       64.2%
praetorian    69.6%      cornicen      61.4%
ballistarius  69.4%      sagittarius   60.6%
cataphract    67.8%      signifer      56.6%
equites       67.0%      medicus       53.1%
vestalis      65.4%
```

The top of the table is melee bruisers; the bottom is support and utility. The
19.6-point spread between Legionary and Medicus is large for a 3-slot party game.

**Signifer (56.6%)** is the clearest problem. It contributes real block (38/fight) but
little else, and its down rate is among the worst (49%). It appears in the weakest
decile of teams far more often than the strongest.

**Medicus (53.1%)** deserves a caveat: the AI plays it as a *poison* class, not a
healer (31 poison/fight vs 6 healing). That may be correct play — poison ticks for its
full value then decays, so N poison deals N(N+1)/2 — or it may be the AI undervaluing
healing. Worth a human check before acting.

## 5. Team composition matters more than any single class

Best and worst 3-class teams over 12 full marches each:

```
STRONGEST                                   WEAKEST
legionary + sagittarius + vestalis  100%    medicus + cornicen + arcania      0%
legionary + praetorian  + vestalis  100%    centurion + medicus + arcania     0%
legionary + wulfswestr  + vestalis  100%    medicus + sagittarius + arcania   8%
praetorian + wulfswestr + cataphract 100%   medicus + sagittarius + signifer  8%
```

A 0%-to-100% swing across compositions is much wider than the 20-point swing across
individual classes. Frontline presence is the deciding factor: every top team has at
least one of Legionary / Praetorian / Wulfswestr / Cataphract, and the 0% teams have
none.

Vestalis is interesting — middling on its own (65.4%) but present in 10 of the top 29
teams. It is a good *complement* and a poor *carry*.

## 6. Rarity does not deliver power

> **CORRECTION (added after re-testing).** The *individual item rankings* below were
> under-powered and should be ignored. Each item was measured over 22 marches against a
> ~20% base rate, where the standard error is ~8.5 points — so ±17-point swings are
> expected noise across ~80 items. Re-running the extremes at n=100:
>
> | item | n=22 (below) | n=100 |
> |---|---|---|
> | baseline | 19.7% | 20% |
> | Boar Tusk Pauldron | 0% (−20) | **21%** |
> | Scout's Leather | 36% (+17) | **14%** |
> | Pilum of the Lost | 41% (+21) | **21%** |
>
> No individual item is confirmed as an outlier. The **rarity aggregate is still
> informative** — it averages 33–37 items over ~750 marches per tier — so "rarity
> delivers almost nothing" stands. The named items do not.

March-7 completion with each item forced onto the party (baseline 19.7%):

```
uncommon   17.8%   (33 items)
rare       19.4%   (37 items)
epic       20.0%   (35 items)
```

**2.2 points separates uncommon from epic.** Rarity is currently almost decorative.
Individual items swing far more than their rarity tier does:

```
STRONGEST                              WEAKEST
Pilum of the Lost    [epic]   +21      Boar Tusk Pauldron  [rare]  -20
Vulcan's Hammer      [epic]   +21      Plague Doctor's Mask [rare] -11
Scout's Leather      [uncommon] +17    Viper's Fletching   [rare]  -11
Windreader's Charm   [rare]   +17      Thusnelda's Standard [epic] -11
Varus's Last Shield  [epic]   +17      Packleader's Bow    [epic]  -11
```

**Scout's Leather is an uncommon outperforming most epics.** **Boar Tusk Pauldron is a
rare that measures *worse than having nothing* (0% vs 19.7% baseline)** — worth
inspecting; a rare item should not be a downgrade.

## 7. Hardest normal encounters

```
march 7  Dead Legion           0%   (2.5 turns — the party dies fast)
march 8  Heart Guardians      10%
march 7  The Rotting Core     20%
march 8  Dead Legion          20%
```

Note the turn counts: these are not grinds, they are burst wipes. "Dead Legion" at
march 7 lost every single simulated attempt.

At the other end, eight march-8 encounters sit at 100% — including "The Thorn Canopy"
(1.9 turns) and "Toxic Shallows" (2.1 turns). The march-8 pool has a very wide spread.

## 8. Synergistic but underpowered

The clearest case is **poison**. It scales superlinearly — N poison deals N(N+1)/2
damage — and stacks with `equipPoison`. The AI converges on it for the Medicus,
Sagittarius and Arcania (20–31 poison damage per fight). Yet all three sit in the
bottom half of the class table.

The mechanic is strong; the classes built on it are not. That gap is where the design
space is: poison needs either faster application or a payoff for stacking, because
right now the classes that enable it die before it pays off (Medicus down rate 53%,
Arcania 49%).

### 8a. Poison IS strong against bosses — the march average hides it

Prompted by a playtest recollection that poison teams felt very strong against bosses,
measured directly with the team held constant (Medicus + Sagittarius + Legionary,
march 6, 250 fights per cell):

| target | poison applied | damage realised | conversion | fight length |
|---|---|---|---|---|
| **Boss** | 67.9 | **91.3** | **1.35×** | 6.9 turns |
| Normal encounter | 45.3 | 53.1 | 1.17× | 4.6 turns |

Poison deals **72% more damage per boss fight**, at a better conversion rate, because
longer fights let stacks tick out instead of being wasted on enemies that die early.
The playtest recollection is correct; the class table in section 4 averages over a
march that is 6 normal fights to 1 boss, which drowns the effect.

**But the compounding is far from realised.** A single stack of N poison yields
`N(N+1)/2` damage — a conversion of `(N+1)/2`, so a stack of 6 should convert at 3.5×.
Measured conversion even against bosses is 1.35×. Poison is being applied in small
increments (3–4 at a time) and fights end before large stacks pay off.

That is the actual design gap: the mechanic's payoff curve rewards big stacks, but
nothing in the kits enables building one.

---

## Caveats — read before acting

**The skill pick-rate section is the least trustworthy part of this report.** The
simulated player scores 52 of the 115 effect keys the game uses. 13 of 156 skills are
built entirely on effects it cannot value, and those will never be picked regardless of
quality. The report separates these into a "NOT EVALUATED" list — treat that list as
"unknown", not "weak".

Even for skills it does model, the AI is a greedy one-step scorer. It does not plan
combos, set up multi-turn payoffs, or hold resources. Skills whose value is in setup
(marks, buffs, positioning) are systematically undervalued. Where the report says
"loses to its own alternatives", read it as "a naive player gets no value from this" —
which is still useful for a game teaching new players, but it is not proof the skill is
weak in expert hands.

**What is solid:** the class table, the combination table, boss and encounter win
rates, item impact, and the march-length curve. These come from complete fights played
to a win or a loss, and the same AI plays every side, so comparisons are fair even
where the absolute skill level is below a good human's.

**What would sharpen it:** a smarter AI (lookahead, resource holding) would raise all
absolute numbers and probably compress the class spread. The relative ordering is
unlikely to change much.
