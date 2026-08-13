# Playtest Feedback Response — Design

**Date:** 2026-08-12
**Source:** Browser playtest feedback (~24 items)
**Scope decision:** All items, phased. P0 blockers → correctness → clarity → balance.

---

## Summary of investigation

Every reported item was traced to code. Most reports were accurate; several turned
out to be symptoms of larger defects than the report suggested.

Three findings dominate:

1. **Music never plays in a browser** — not a missing asset, a broken audio graph.
2. **Every class unlocks after March 1** — a run-completion counter fires on every
   march boss, and the unlock ladder cascades from it.
3. **"Numbers seem incorrect" is one systemic problem, not many small ones** — three
   independent description/value drift mechanisms, plus a poison-math misconception
   that is arguably a UI failure rather than a bug.

Two reported items are working as designed and need only wording changes
(morale-on-boss-death, Fortified Strike).

---

## Phase 0 — Blockers

### 0.1 Music is silent in browsers

**Cause.** `playTrack` (`js/main.js:253`) calls `initAudioContext()` then
`connectTrackToFilter(audio)`, which runs `createMediaElementSource(audio)`
(`js/main.js:201`). Routing an `<audio>` element through a `MediaElementAudioSourceNode`
permanently detaches it from the default output — audio now reaches the speakers
*only* through the Web Audio graph. Under browser autoplay policy the `AudioContext`
is created in `suspended` state, and **there is no `audioCtx.resume()` call anywhere
in the codebase**. The graph is therefore silent.

`initAudioContext` returns early on `file://` (`js/main.js:149`), leaving `audioCtx`
null so no source node is created and the element plays normally. That is exactly why
this reproduces in the browser and not locally.

`audio.play().catch(() => {})` (`js/main.js:262`) swallows the only diagnostic.

**Change.**
- Add `resumeAudioContext()` that calls `this.audioCtx.resume()` when
  `this.audioCtx.state !== 'running'`.
- Call it from `playTrack`, and from the first user gesture on the start screen
  (`bindStartScreen`, `js/main.js:592`) before `playTrack` runs.
- Guard `connectTrackToFilter`: if the context cannot be resumed, skip the source
  node entirely and let the element play directly. Losing the morale lowpass filter
  is strictly better than losing all audio.
- Replace the empty `.catch(() => {})` with one that logs and falls back to an
  unfiltered element.

**Verify.** Serve over `http://` (not `file://`), load in Chrome, click Start,
confirm audio and `game.audioCtx.state === 'running'`.

### 0.2 Default music volume mismatch

`loadSettings` defaults `musicVolume: 15` (`js/main.js:132`); the slider markup
defaults to `35` (`index.html:96`). A fresh player sees 35% and hears 15%.

**Change.** Keep the actual default at 15. Correct the markup instead — set
`index.html:96` `value="35"` → `value="15"` and `index.html:97` `35%` → `15%`, so the
displayed value matches what is playing.

### 0.3 Every class unlocks after March 1

**Cause.** `js/ui.js:4813` calls `window.game.trackRunEnd(true)` after *every* march
boss victory, not only the final one. `trackRunEnd` increments `runsCompleted`
(`js/main.js:952`). `class_vestalis` unlocks at `runsCompleted >= 1`
(`js/main.js:1827`), and the backfill chain then cascades:

```
Vestalis → Cataphract (:1808) → Praetorian (:1803)
        → Ballistarius (:1798) → Equites (:1793) → Signifer (:1788)
```

One March 1 clear unlocks the entire roster.

Side effects: `runsCompleted`, `totalRuns`, `totalRenown` and the leaderboard are all
inflated by up to 8× per run; `clearSavedRun()` also fires on every march boss.

**Change.** Split the two concerns:
- `trackMarchComplete()` — per-march bookkeeping (renown, march stats, saved-run
  handling). Called at `ui.js:4813`.
- `trackRunEnd(victory)` — called only on true run end: the March 8 boss falls
  (the existing `isFinalVictory` test at `ui.js:4820`), or the run is lost.

### 0.4 Rebuild the unlock ladder against 8 marches

**Cause.** `MARCH_THEMES` defines marches 1–8 only (`js/main.js:49-56`) and
`isFinalMarch = difficulty >= 8` (`js/map.js:8`). But:

- `class_cataphract` requires `currentDiff >= 9` (`js/main.js:1808`) — **unreachable**.
  The achievements screen shows "Reach March 9" and sticks at `March 8/9`
  (`js/main.js:2070`). Its only real path today is the Vestalis cascade.
- `class_praetorian` at `>= 8` is reachable only on the final march.
- Run-complete flavor text says "After ten marches" (`js/ui.js:4825`) — inconsistent
  with an 8-march structure.

Fixing 0.3 alone would make Cataphract and Vestalis effectively unobtainable. Per the
constraint *"staggered out reasonably but still reachable in general"*:

| Rung | Class        | New condition                              |
|------|--------------|--------------------------------------------|
| 1    | Signifer     | Reach March 3 (unchanged)                  |
| 2    | Equites      | Reach March 5 (unchanged)                  |
| 3    | Ballistarius | Reach March 7 (unchanged)                  |
| 4    | **Vestalis** | **Reach March 8**                          |
| 5    | Cataphract   | Complete one full run (`runsCompleted >= 1` or `boss_spirits_defeated`) |
| 6    | **Praetorian** | **Complete two full runs (`runsCompleted >= 2`)** |

Vestalis and Praetorian are swapped relative to the first draft: Vestalis becomes the
March 8 reward and Praetorian becomes the two-run capstone.

Keep the downward backfill cascade — it guarantees a deep-diving player is never
missing an earlier class. It was never the bug; the early Vestalis trigger was. **The
cascade chain must be rewritten to match the new rung order above**, since it currently
hardcodes the old sequence (`js/main.js:1788-1828`). Concretely, each rung's condition
becomes `own condition OR any higher rung already unlocked`, evaluated in rung order —
so Praetorian no longer appears in Ballistarius's or Equites's backfill list ahead of
Vestalis and Cataphract.

Also update the achievements-screen copy for all changed rungs
(`js/main.js:2066-2070`) and the "ten marches" flavor line (`js/ui.js:4825`).

### 0.5 `grantBlock` corrupts unit block

**Cause.** `grantBlock` is overloaded. As a number it grants temporary block; as
`{amount, tag, count}` it grants permanent `equipBlock`. `resolveEventChoice` handles
both, but the numeric branch runs first and is not type-guarded:

- `js/ui.js:3063-3066` — `u.block = (u.block || 0) + effects.grantBlock` with an
  object operand produces the **string** `"0[object Object]"`, poisoning block
  arithmetic for the encounter.
- `js/ui.js:3144` — prints `(+[object Object] Block)`. This is the reported
  "+object (object) block" on the Abandoned Armory officer choice
  (`data/events.js:477`).
- `js/ui.js:3194` — the object branch, which then applies the intended effect.

**Change.** Type-guard the numeric branch with
`typeof effects.grantBlock === 'number'` at both `:3063` and `:3144`, and give the
object branch its own outcome text (matching the `grantDamage` pattern at `:3158`).
Audit `grantDamage`/`grantMaxHp`/`grantHeal` for the same overload hazard.

---

## Phase 1 — Correctness

### 1.1 Runic Stone never levels

**Cause.** `createLeveledItem` (`js/data.js:764-765`) excludes `extraDice` from both
`positiveKeys` and `negKeys`. Runic Stone's stats are `{ extraDice: 1 }` and nothing
else (`data/items.js:18`), so both key lists are empty and the bonus-level loop never
runs. A Lv5 Runic Stone is identical to a Lv1. The Respite blacksmith also filters it
out (`js/ui.js:5013`).

The exclusion is deliberate — `+1 die` per level would be absurd — but the result is a
dead item at every level above 1.

**Change.** Give Runic Stone a secondary scalable stat (`maxHp: 2`) so levels have
somewhere to land, keeping `extraDice` excluded from scaling. Add a guard in
`createLeveledItem`: if no scalable stat exists, return the base ID unchanged rather
than minting a fake leveled instance. Audit all items whose only positive stat is
`extraDice`.

### 1.2 Dice can be staged onto skills that cannot use them

**Cause.** `onDieClickStaged` (`js/ui.js:733`) performs no eligibility check. Its
capacity cap reads `skill.cost.dice`, which is defined only for `combined` and
`combinedExact` (`js/dice.js:86-91`). For `threshold`, `exact`, `range`, `any`,
`even`, `odd`, `pair`, `consecutive`, `oddEven`, `pairExact6` it is `undefined`, so
`diceIds.length >= undefined` is always false and the cap never fires — five dice can
be piled onto a one-die skill.

**Change.**
- Add `requiredDiceCount(cost)` in `js/dice.js` returning the true arity per cost type
  (1 for single-die types, 2 for pair/consecutive/oddEven, `cost.dice` for combined).
- Add `canAcceptDie(cost, staged, die)` rejecting dice that can never satisfy the cost
  (e.g. value below `threshold.min`, outside `range`, wrong parity, wrong `exact.val`).
- In `onDieClickStaged`, reject ineligible dice and use the real arity for the cap.
- Render ineligible dice dimmed/non-interactive while a skill is staged, so the rule is
  visible rather than merely enforced.

### 1.3 Centurion +/- and Cornicen reroll vanish on skill select

**Cause.** Both controls are gated on `!this.stagedSkill` (`js/ui.js:680`, `:711`), so
staging a skill removes them — precisely when the player wants to nudge a die to make
the cost.

**Change.** Drop the `!this.stagedSkill` condition. Re-render staged state after an
adjustment so a die that becomes ineligible is unstaged cleanly. Sequence with 1.2 —
these two touch the same render path.

### 1.4 Replace-slot selection is silently ignored

**Cause.** Filled slots are always clickable and set `_replaceSlotIdx`
(`js/ui.js:4318`), showing a stat diff and a `selected-replace` highlight. But
`js/ui.js:4326` renders the replace button only in the `else` of `if (hasEmpty)`, and
`engine.equipItem` prefers the empty slot (`js/combat.js:5060`). The player selects a
slot, sees a comparison, presses Equip, and the item lands somewhere else.

**Change.** Per the report — when `hasEmpty` is true, make filled slots
non-interactive and skip the diff. Empty slots fill first; replacement is offered only
once the slot group is full.

### 1.5 Enemy intent does not match execution

**Causes.** In `rollEnemyIntents` (`js/combat.js:4686`):
- Ignores `_untargetable`, which `pickEnemyTarget` honours (`js/combat.js:4768`), so a
  Dead Drop target can be previewed and then swapped at execution.
- `isAoe = action.aoe && action.damage > 0` (`:4753`) — an AoE action with no direct
  damage (e.g. `Bile Spray`-style poison spread) previews as single-target.
- `woundedDoubleAttack` enemies (`data/enemies.js`, 5 enemies) strike twice below 50%
  HP but preview one hit.

**Change.** Extract the shared selection logic so `rollEnemyIntents` and
`pickEnemyTarget` cannot drift: one `selectTarget(enemy, action)` used by both. Base
`isAoe` on `action.aoe` alone. Add `hits: 2` to the intent when
`woundedDoubleAttack` is active and the enemy is below 50%.

**Dead sniper code — delete, do not implement.** The first draft of this plan proposed
adding the missing sniper targeting branch. That was wrong: **no enemy has
`ai: "sniper"` any more.** The AI values actually in use are `aggressive` (26),
`boss` (20), `defensive` (3), `passive` (1), `bully` (1). Snipers were removed from the
data but their code was left behind, so `isSniper: e.ai === 'sniper'`
(`js/combat.js:4760`) is always false and the tooltip's "(Lowest HP)" branch
(`js/ui.js:526-528`) is unreachable. Remove both, rather than reviving behaviour that
was deliberately cut for being unfair.

---

## Phase 2 — Clarity

### 2.1 Enemy action riders are invisible — including the boar stun

**Cause.** The tooltip action renderer (`js/ui.js:401-419`) surfaces only `damage`,
`poisonTarget`, `morale`, `blockAllEnemies`, `blockFrontRow`, `blockSelf`, `spawn`,
`aoe`, `ignoreRow`. Enumerating every key used inside enemy `actions[]` shows these
are **never displayed**:

| Key | Uses | Effect |
|---|---|---|
| `cooldown` | 64 | Action is on a timer |
| `runeBinding` | 3 | Locks dice |
| `pierceBlock` | 2 | Ignores block |
| `boarCharge` | 1 | **Moves to front row and stuns the target** (`js/combat.js:4553-4561`) |
| `multiTarget` | 1 | Hits several units |
| `markTarget` | 1 | Applies mark |
| `damageFromBlock` | 1 | Converts own block to damage |
| `weakenTarget` | 1 | Debuffs target |
| `healAlly` / `healSelf` | 2 | Healing |
| `selfDamage` | 1 | Recoil |

War Boar's "Boar Charge" (`data/enemies.js:294`) sets `target._stunNextTurn = true`.
The tooltip renders it as `Boar Charge (7 dmg)` — no stun, no row shift, no mention of
its 4-turn cooldown. That is the reported missing stun.

`cooldown` being invisible across 64 actions is the larger issue: players cannot tell
a heavy hit is on a timer.

**Change.** Extend the detail renderer to cover every key above, driven by a single
`ACTION_RIDER_LABELS` map so new riders can't be silently omitted again. Show
`cooldown` as `every N turns`. Reuse the same map in the intent line (2.2) so preview
and bestiary always agree.

### 2.2 "Next attack" is unlabelled, hidden, and numberless

**Cause.** Intent is appended as a bare line inside the enemy tooltip
(`js/ui.js:487-535`), reachable only by hover or a 300 ms touch-hold
(`js/ui.js:382`). It has no "Next attack" heading and shows no damage value — exact
numbers exist only behind the Fog Sight boon (`js/main.js:73`).

**Change.**
- Label the block `NEXT ATTACK` in the tooltip.
- Add a persistent intent badge on the enemy card itself (icon + damage), so the
  information does not require discovery.
- Show damage as a range by default; Fog Sight keeps its role of showing the exact
  roll. Render `×2` when `hits: 2` from 1.5, and rider icons from 2.1.

### 2.3 Incoming damage preview on the unit HP bar

**Confirmed feasible — party units do have HP bars.** `renderParty` builds
`.hp-bar-container` → `.hp-bar` → `.hp-fill` with a `.hp-text` reading
`${unit.hp}/${unit.maxHp}` (`js/ui.js:820-828`), and there is already a `.hp-drain`
layer (`css/game.css:1033`) used to animate damage after the fact.

**Change.** Reuse that layer as a forecast rather than only a post-hoc animation. On
hovering (or press-holding) an enemy's *Next Attack* block, render a `.hp-threat`
segment on each targeted unit's HP bar, spanning from the current HP leftward by the
predicted damage:

- Subtract the unit's current `block` first, so the segment shows damage that will
  actually reach HP; if block absorbs it entirely, show a block-coloured pip instead.
- Clamp at 0 and mark the segment lethal-styled when the hit would down the unit —
  this is the case players most need to see.
- For AoE intents, highlight every alive unit; for `hits: 2` from 1.5, size the segment
  for both strikes.
- Clear on mouseleave / touchend, alongside the existing
  `enemy-target-highlight` cleanup (`js/ui.js:537-540`), so both highlights share one
  teardown path.

Depends on 1.5 landing first — an inaccurate forecast is worse than none.

### 2.4 Morale readouts

- Tooltip sets `tooltip.textContent = effects` (`js/ui.js:50`) — never contains the
  word "Morale" or the value. **Change:** prefix with `Morale: N/100 — <Band>`.
- Camp shows `Morale: 62 (Steady)` (`js/ui.js:3760` and `:4979`). **Change:**
  `Morale: 62/100 (Steady)`.

### 2.5 Dice and attack range are never taught

- Dice get one 8-second toast (`first_roll`, `js/main.js:1921`) that disappears
  permanently once dismissed (`lc_hints_seen`, `js/main.js:1903`).
- Attack range has **no explanation anywhere**. `ignoreRow` renders as "Ranged" prose
  hand-written into some skill descriptions (`data/classes.js:208`, `:227`); the rule
  that melee cannot reach the back row while the front row lives is never stated.

**Change.**
- Add a persistent, re-openable Rules/Help panel (dice cost families, poison math,
  block, morale bands, rows and range) reachable from the options cog.
- Derive a range badge on every skill card from `ignoreRow` — `MELEE` / `RANGED` —
  instead of relying on prose.
- Extend first-combat hints into a short sequenced set covering cost families and row
  restriction, and let hints be replayed from the Help panel.

### 2.6 Poison math is unexplained — the root of "numbers seem incorrect"

Poison ticks for its full value and then decays by 1 (`js/combat.js:3996-3999`), so
**N poison deals N(N+1)/2 total damage**: `+2 Poison` → 3 damage, `+4 Poison` → 10.
Nothing in the UI says this. This is the most likely explanation for
*"the item that says +2 poison seems to deal more than it says"*.

**Change.** State total damage wherever poison is applied or displayed:
`2 Poison (3 damage over 2 turns)`. Add poison to the Help panel.

### 2.7 Skill descriptions do not reflect equipment

Static description strings never account for equipment scaling. Plague Flask
(`data/classes.js:227`) reads *"4 Poison to target, 2 Poison to adjacent enemies"* but
applies `4 + floor(equipPoison × 1.15)` and `2 + floor(equipPoison × 0.5)`
(`js/combat.js:2314-2347`) — always **≥** the printed value, never less. The reported
"less poison than it says" is the adjacent-splash *appearing* small next to an inflated
main-target number.

**Change.** Extend the existing live-preview mechanism — already implemented for
Calculated Dosage at `js/ui.js:1199-1204` — into a general
`resolveSkillNumbers(unit, skill)` used by every skill card, showing `4 → 6` when
equipment modifies a value.

### 2.8 Item special text does not scale

`formatItemSpecial` (`js/data.js:826`) scales text only for items in
`ITEM_SPECIAL_SCALING` (`js/data.js:805-824`). **88 items carry `special` text; only
18 have a formula.** The remaining 70 print Lv1 numbers at every level. Several *are*
scaled in combat — e.g. `chiefs_spear` uses `2 + (csLv - 1)` (`js/combat.js:3547`) —
so text and behaviour genuinely diverge.

**Change.** Move the scaling formula onto the item definition itself (a `scaling`
field in `data/items.js`) so text and behaviour come from one place, and add a startup
assertion that every item with a level-scaled effect declares one. Audit all 70.

### 2.9 Brief Respite shows no skill information

Upgrade buttons render only `Unit — Skill Name` plus the delta
(`js/ui.js:5160-5163`). No cost, target, cooldown, or description.

**Change.** Reuse the combat skill-card tooltip component on hover/hold.

Related: the description-patching regex (`js/ui.js:5175-5190`) rewrites only the first
number of the first numeric effect key. For multi-number skills like Plague Flask,
upgrading `poison` updates "4 Poison" and leaves the splash value stale — another
contributor to 2.7. Fold into the 2.7 fix.

Note: skills whose only numeric effect is `0` are excluded from the upgrade pool by
the truthiness test at `js/ui.js:5105`. Fortified Strike (`damage: 0`) is therefore
never offered — currently harmless, but fragile. Use explicit `!== undefined` tests.

### 2.10 Wording fixes

- **Calculated Dosage** (`data/classes.js:271`): change *"All unique: double poison…"*
  to *"All dice unique: double poison and deal 4 damage."*
- **Fortified Strike** (`data/classes.js:90`): the implementation is correct —
  `+2 Block` then damage equal to the **new** total (`js/combat.js:2975-2983`). Only
  the ordering is ambiguous. Change to *"Gain 2 Block, then deal damage equal to your
  total Block."*
- **Morale on boss death**: working as designed — restores to 75, or `+12` if already
  ≥75 (`js/combat.js:3531-3539`). No change; document in the Help panel.

---

## Phase 3 — Balance

Ship after Phases 0–2 and re-test; several "balance" complaints may resolve once the
numbers are displayed honestly.

### 3.1 Shorten marches

`maxMidDepth` 6 → 4 for standard marches, 4 → 3 for the final march (`js/map.js:9`).

**Critical dependency.** Threat tiers are keyed to absolute depth and must be rescaled,
or the shorter march is also silently easier:
- `js/map.js:51,53` — `depth >= 5` / `depth >= 3` → `depth >= 4` / `depth >= 2`
- `js/map.js:198-199` and `:240-241` — same thresholds, same shift
- `js/map.js:253` — `node.depth < 3` gate
- `js/map.js:494-495` — `n.depth <= 5` bound

Also revisit the fixed "convert 2 mid combats to events" rule (`js/map.js:118`): with
fewer nodes, a fixed 2 removes a larger share of the fights. Scale it to node count.

### 3.2 Transfusion cost

Currently 6 HP self-cost for 6 HP + 3 Block on an ally, cost `range 2-4`
(`data/classes.js:255-258`) — a net-zero HP trade plus block, on a squishy Medicus.

**Change.** Reduce self-cost to 4 HP. Re-evaluate after Phase 2, since the true value
depends on `equipHeal` scaling that the card never showed.

### 3.3 Grove Witch scales weakly when encountered late

Her threat is built from flat and lightly-scaled numbers: totem block `3 × difficulty`
(`js/combat.js:5368`), totem heal `6 + (difficulty - 1) × 2` (`:5357`). Meanwhile
party power grows via item levels and permanent stat grants. She is a `minDifficulty`-less
boss in the March 1 pool (`data/gamedata.js:15`) yet re-rollable much later.

**Change.** Scale her max HP and action damage with `difficulty` the way later bosses
do, and increase totem count or heal rate at higher marches. Requires comparing her
scaling curve against the March 5–8 bosses before picking numbers — treat as an
investigation task, not a fixed edit.

### 3.4 Class unlock pacing

Covered in 0.4.

---

---

# Addendum — Second pass (full code review, 2026-08-13)

Findings from a pass over areas the playtest feedback did not cover. Two of these are
more severe than anything in the original list, and one of them is a second, larger
source of the "numbers seem incorrect" reports.

## A. Run-to-run state integrity

### A.1 — P0. Skill upgrades permanently mutate `CLASS_DATA`

**Proven, not inferred.** Unit skills are shallow-copied from class data:
`allSkills: data.skills.map(s => ({ ...s }))` (`js/combat.js:52`, and again on resume
at `js/main.js:1066`). A spread copy leaves `effects` pointing at the *same object* as
`CLASS_DATA`. `buildClassData` runs once per page load (`js/data.js:520`), so that
object is shared by every unit in every run for the whole session.

Brief Respite then writes straight through it — `baseDef.effects.damage += amt`
(`js/ui.js:5166`).

Reproduced against the real data files:

```
skill                  : strike
shares effects object? : true
CLASS_DATA dmg BEFORE  : 3
CLASS_DATA dmg AFTER   : 5
NEW RUN dmg            : 5
NEW RUN description    : Deal 3 damage.
```

Consequences:
- **Balance exploit.** Upgrades compound across runs. Start a run, take a Respite
  upgrade, abandon, start again — the buff persists until the page is reloaded.
- **Permanent description desync.** A new run's Strike deals 5 while its card says
  "Deal 3 damage" forever. This is very likely a major contributor to the reported
  *"in general the numbers seem to be incorrect"* — independent of, and larger than,
  the equipment-scaling issue in 2.7.
- Resuming a save rebuilds `allSkills` from an already-corrupted `CLASS_DATA`.

**Change.** Deep-copy skill effects when building a unit:
`allSkills: data.skills.map(s => ({ ...s, effects: { ...s.effects } }))` at both
`js/combat.js:52` and `js/main.js:1066`. Audit `buildSkill` (`js/data.js`) for the same
sharing between `RAW_CLASSES` and `CLASS_DATA`. Then persist per-run skill upgrades in
the save (see A.2) so they survive a resume without touching globals.

Worth doing **before** the Phase 2 description work — otherwise 2.7 is built on a
moving target.

### A.2 — P1. Leveled items re-roll their stats on resume

`createLeveledItem` distributes bonus levels by weighted *random* pick
(`js/data.js:776-785`). The save stores only the instance ID (`js/main.js:1012`), and
`resumeSavedRun` rebuilds the instance by calling `createLeveledItem` again
(`js/main.js:1098`). The distribution is therefore re-rolled.

Same item, Lv5, created five times:

```
base iron_gladius stats: {"damage":2,"maxHp":1}
  resume 1 -> {"damage":6,"maxHp":1}
  resume 2 -> {"damage":4,"maxHp":3}
  resume 3 -> {"damage":6,"maxHp":1}
  resume 4 -> {"damage":5,"maxHp":2}
  resume 5 -> {"damage":5,"maxHp":2}
```

A player who closes the tab and resumes gets a materially different weapon.

**Change.** Serialize leveled instances fully — `{id, baseId, level, stats}` — into the
save, and re-register them verbatim on resume instead of regenerating. Keep the ID
parse only as a migration fallback for existing saves.

### A.3 — P1. `ITEM_DATA` grows unbounded and leaks into random item pools

`createLeveledItem` registers each instance into the global `ITEM_DATA`
(`js/data.js:799`) and nothing ever removes them. Two enumeration sites have **no
`baseId` guard**, so session-generated leveled instances become selectable:

- `js/main.js:2188` — King's Hoard boon picks a random uncommon. Can hand out a Lv5
  uncommon whose power depends entirely on what happened earlier in the session.
- `js/ui.js:3600` — trader rarity-upgrade candidates. Can offer leveled instances.

Two other sites *are* guarded (`js/main.js:530`, `js/ui.js:3111`), which confirms the
guard was intended and simply missed here.

**Change.** Add `if (item.baseId) return false;` at both sites. Better: move leveled
instances into a separate `ITEM_INSTANCES` registry that `getItemData` falls back to,
so base-item enumeration can never see them. Clear run-scoped instances on run end.

## B. Delivery and payload

### B.1 — P1. Asset payload is 293 MB

```
assets/   293M      mp3 183M      png 93M
```

Enemy portraits are shipped at source resolution: `enemy_grove_witch.png` is
**1024×1536 and 3.7 MB**; ~85 portraits average ~1.1 MB. They render as small
portraits and tooltip thumbnails. This is a mobile-first browser game — a player who
meets a dozen enemy types pulls tens of megabytes over mobile data.

The `reducedArt` setting exists (`js/main.js:2256`) but gates *display*, not download
size, and defaults to off.

**Change.** Convert portraits to WebP at display resolution (roughly 512×768 at 2× for
the largest use), keeping PNG fallbacks only if browser support demands it. Expect
93 MB → well under 5 MB. Serve music at a lower bitrate and keep the existing
`fullSoundtrack` gate for the extended tracks. This is likely the single largest
perceived-quality win available and is independent of all gameplay work.

### B.2 — P1. No cache-busting on scripts

`index.html:361-371` loads six `.js` files with no version query, and `combat.js` /
`ui.js` are ~250 KB each. There is a visible `v0.4.19` label (`index.html:46`) but
nothing ties it to asset URLs. Returning players can run stale JavaScript against fresh
HTML after a deploy.

This has a bearing on the playtest itself: some observations may have come from a
stale bundle. Worth fixing before the next test round so results are trustworthy.

**Change.** Append `?v=0.4.19` to every local `<script>`/`<link>` and drive it from the
same constant as the on-screen version label.

### B.3 — P2. Six dead data files with contradictory content

`data/*.json` (`classes`, `enemies`, `items`, `events`, `encounters`, `config`) are
never loaded by `index.html` and never fetched at runtime — the live data lives in the
`.js` files. They are also *stale and contradictory*: `data/classes.json:206-210`
defines Plague Flask as `threshold 3 / all_enemies / "Apply 3 Poison to all enemies"`,
while the live definition (`data/classes.js:224-228`) is `range 4-5 / single_enemy /
4 poison + 2 splash`.

Anyone — human or tool — reading these for balance work gets wrong answers.

**Change.** Delete them, or move to `data/_legacy/` with a README. Deleting is cleaner;
git history preserves them.

## C. Correctness hygiene

### C.1 — P2. Biased shuffles decide the class draft, skill offers, and loot

`array.sort(() => Math.random() - 0.5)` appears **20+ times** across
`js/combat.js`, `js/main.js`, `js/map.js`, `js/ui.js` — including the class draft
(`js/main.js:480`), skill offers (`js/main.js:496`, `js/combat.js:4876`), event stat
grants (`js/ui.js:3154-3198`), and map event placement (`js/map.js:120`).

This is not a uniform shuffle. Measured over 200,000 trials, picking 3 of 6:

```
Pick rate per element (fair = 50.0%):
  item 0: 54.9%   item 1: 56.8%   item 2: 47.1%
  item 3: 52.5%   item 4: 38.8%   item 5: 49.9%
```

The bias is **position-dependent**, so it silently favours whatever happens to sit
early in the data file. Element 4 is offered ~1.5× less often than element 1. For
draft fairness and loot variety this is a real defect, not a style nit — and it would
read to a playtester as "I keep getting the same classes."

**Change.** Add a `shuffle(array)` helper using Fisher–Yates, returning a new array,
and replace every occurrence. Mechanical, low-risk, easy to verify.

### C.2 — P3. `parseInt` without radix

~10 sites (`js/main.js:807`, `:815`, `:1095`, `:1445`; `js/ui.js:1209`, `:1241`, and
others). Harmless with current inputs, but `parseInt(match[2])` on a version-like
string is exactly where this bites later.

**Change.** Add radix 10. Trivial.

## D. Structure

### D.1 — P3. `combat.js` (5,408 lines) and `ui.js` (5,288 lines)

Both files mix many responsibilities: `ui.js` holds combat rendering, the map screen,
event resolution, loot, the Respite screen, and skill-description formatting. Several
bugs in this document exist because related logic sits far apart — the intent
preview (`js/combat.js:4686`) and its consumer (`js/ui.js:487`) drifted precisely
because nothing forces them together.

**Change.** No big-bang refactor. Extract along the seams the fixes already touch:
`skill-text.js` (description resolution, 2.7/2.8), `intent.js` (shared target
selection, 1.5), `loot-screen.js` (1.4). Each extraction lands with the fix that
motivates it.

## Suggested sequencing change

Insert **A.1 before Phase 1**, and **B.2 before the next playtest** so the next round of
feedback is measured against the code actually shipped. A.2, A.3, B.1, B.3 and C.1 fit
alongside Phase 1. C.2 and D.1 are opportunistic.

---

## Explicitly not doing

- Rebalancing enemies beyond Grove Witch — no evidence of a problem in the feedback.
- Rewriting the event effect system despite the `grantBlock` overload; 0.5 type-guards
  it. A full redesign is out of scope for a playtest response.

---

## Verification

- **Music:** serve over `http://`, confirm playback and `audioCtx.state === 'running'`
  in Chrome and Safari.
- **Unlocks:** fresh profile, clear March 1, assert only Signifer-and-below rules
  apply and `runsCompleted === 0`.
- **`grantBlock`:** trigger the Abandoned Armory officer choice; assert
  `typeof unit.block === 'number'` afterwards and the outcome text has no
  `[object Object]`.
- **Runic Stone:** create at Lv5, assert stats differ from Lv1.
- **Dice:** stage a `threshold: 5` skill, assert dice below 5 cannot be selected and at
  most one die stages.
- **Intent:** force a `woundedDoubleAttack` enemy below 50% HP and an AoE
  zero-damage action; assert preview target, hit count and AoE flag match execution.
  Assert no `sniper` reference survives in `js/`.
- **Damage preview:** hover an intent targeting a unit with block; assert the threat
  segment reflects post-block damage, and that a lethal hit renders lethal-styled.
- **March length:** generate 20 maps at each difficulty; assert node count dropped by
  ~2 and the top threat tier still appears.

Second-pass items:

- **A.1 skill mutation:** take a Respite upgrade, abandon the run, start a new one;
  assert the skill's damage equals its base value and matches its printed description.
  Add a regression check that `unit.allSkills[i].effects !== CLASS_DATA[...].effects`.
- **A.2 item reroll:** equip a Lv5 item, record its stats, save, reload, resume;
  assert stats are identical.
- **A.3 item pools:** generate leveled instances, then trigger King's Hoard and the
  trader; assert no offered item has a `baseId`.
- **B.1 payload:** assert total `assets/` size and that no shipped image exceeds
  ~200 KB.
- **B.2 cache-busting:** assert every local script/link tag carries the current
  version query.
- **C.1 shuffle:** run the 200k-trial fairness check against the new `shuffle` helper;
  assert every element lands within ~1% of the fair rate.

Manual playtest pass after each phase.
