// ============================================================
// Last Cohort – Combat Engine
// ============================================================

const PHASE = {
  PRE_COMBAT: 'pre_combat',
  SPAWNING: 'spawning',
  ROLLING: 'rolling',
  PLAYER_TURN: 'player_turn',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

class CombatEngine {
  constructor() {
    this.party = [];
    this.enemies = [];
    this.dicePool = new DicePool(4);
    this.morale = 50;
    this.phase = PHASE.PRE_COMBAT;
    this.turn = 0;
    this.turnCount = 0;
    this.log = [];
    this.targetMode = null;
    this.onUpdate = null;
    this.onVisual = null;
    this.difficulty = 1;
    this.totalEnemiesKilled = 0;
    this.encountersCompleted = 0;
    this.totalRenownEarned = 0;
    this.pendingSkillPicks = 0;
    this.encounterXP = 0; // XP bar: grants skill pick every 3 encounters
    this.skillUsageStats = {}; // track skill usage for analytics
  }

  // --- Setup ---
  initParty(classIds) {
    this.party = classIds.map((cid, i) => {
      const data = CLASS_DATA[cid];
      return {
        index: i,
        classId: cid,
        name: `${data.name}`,
        title: data.title,
        maxHp: data.maxHp,
        baseMaxHp: data.maxHp,
        hp: data.maxHp,
        block: 0,
        downed: false,
        allSkills: data.skills.map(s => ({ ...s })),
        skills: [], // populated by getUnlockedSkills
        passive: { ...data.passive },
        passiveTriggered: false,
        buffs: [], // { damage, attacksLeft }
        taunt: false,
        actedThisTurn: false,
        conditions: [],
        equipment: {
          weapon: Array(data.equipSlots ? data.equipSlots.weapon : 2).fill(null),
          armor: Array(data.equipSlots ? data.equipSlots.armor : 2).fill(null),
          trinket: Array(data.equipSlots ? data.equipSlots.trinket : 3).fill(null),
        },
        equipDamage: 0, equipBlock: 0, equipHeal: 0, equipExtraDice: 0,
        stats: { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0 },
      };
    });
    this.party.forEach(u => this.initSkills(u));
  }

  initEncounter(encounterDef) {
    this.enemyDefs = encounterDef.enemies;
    this.enemies = [];
    this.spawnIndex = 0;
    this.turn = 0;
    this.turnCount = 0;
    this.log = [];
    this.phase = PHASE.PRE_COMBAT;
    this.currentEncounterDef = encounterDef;
    this.isAmbush = !!encounterDef.isAmbush;
    this.targetMode = null;
    // Reset epic item combat flags
    this._heartwoodTriggered = false;
    this._heartwoodBonusDice = 0;
    this._lupaFangUsed = false;
    this._eagleUsed = false;
    this._marsSkillCount = 0;
    this.killedEnemies = [];
    this.party.forEach(u => {
      // Preserve camp-granted block and buffs, only reset combat-specific state
      u.taunt = false;
      u.poison = 0;
      u.passiveTriggered = false;
      u._wolfPeltUsed = false;
      u._mushroomRage = 0;
      u.skills.forEach(s => { s.cooldownLeft = 0; });
      u.actedThisTurn = false;
      u.stats = { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0, poisonInflicted: 0 };
      if (u.passive) u.passive.triggered = false;
      this.computeEquipmentStats(u);
    });

    // Special: Raider's Shield — start each combat with 6 block (scales with level)
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'raider_shield')) {
        const lv = this.getItemLevel(u, 'raider_shield');
        const shieldBlock = 6 + (lv - 1) * 2;
        u.block = (u.block || 0) + shieldBlock;
        this.addLog(`${u.name}'s Raider's Shield grants ${shieldBlock} Block.`);
      }
    });

    // Special: War Hound Collar — apply 2 poison to a random enemy at combat start
    if (this.partyHasItem('hound_collar')) {
      // Deferred — enemies aren't spawned yet during initEncounter
      this._houndCollarPending = true;
    }

    // Special: Arm Ring of Arminius — +10 morale at encounter start
    if (this.partyHasItem('arm_ring_of_arminius')) {
      this.morale = Math.min(100, this.morale + 10);
      this.addLog('The Arm Ring of Arminius fills the men with defiance. (+10 Morale)');
    }

    // Special: Centurion's Whistle — +5 morale at combat start
    if (this.partyHasItem('centurions_whistle')) {
      this.morale = Math.min(100, this.morale + 5);
      this.addLog("The Centurion's Whistle steadies the men. (+5 Morale)");
    }

    // Curse: Death's Whisper — start each encounter at -10 morale
    if (this.getActiveCurses().includes('deaths_whisper')) {
      this.morale = Math.max(-100, this.morale - 10);
      this.addLog("Death's whisper chills the air. (-10 Morale)");
    }

    this.addLog(encounterDef.intro);
  }

  beginSpawning() {
    this.phase = PHASE.SPAWNING;
    this.spawnIndex = 0;
    this.spawnNextEnemy();
  }

  spawnNextEnemy() {
    if (this.spawnIndex >= this.enemyDefs.length) {
      // Ambush: enemies strike first before the player gets dice
      if (this.isAmbush) {
        this.isAmbush = false; // only the first turn is ambushed
        this._ambushTargeted = new Set(); // spread targets during ambush
        this.addLog('AMBUSH! The enemy strikes before you can react!');
        this.phase = PHASE.ENEMY_TURN;
        this.update();
        setTimeout(() => this.executeEnemyTurn(), 600);
        return;
      }
      // War Hound Collar: apply poison to a random enemy (scales with level)
      if (this._houndCollarPending) {
        this._houndCollarPending = false;
        const alive = this.enemies.filter(e => !e.dead);
        if (alive.length > 0) {
          const hcLv = this.getPartyItemLevel('hound_collar');
          const hcPoison = 2 + (hcLv - 1);
          const victim = alive[Math.floor(Math.random() * alive.length)];
          victim.poison = (victim.poison || 0) + hcPoison;
          this.addLog(`War Hound's spirit strikes — ${victim.name} is poisoned! (+${hcPoison} Poison)`);
        }
      }
      this.addLog('Prepare yourselves!');
      this.startRollPhase();
      return;
    }
    const eid = this.enemyDefs[this.spawnIndex];
    const data = ENEMY_DATA[eid];
    // Difficulty scaling: HP, damage, poison, and block scale per difficulty above 1
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    let scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.65));
    // Curse: Champion's Mark — bosses have +20% HP
    if (data.isBoss && this.getActiveCurses().includes('champions_mark')) {
      scaledMaxHp = Math.round(scaledMaxHp * 1.2);
    }
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
      poisonTarget: a.poisonTarget ? a.poisonTarget + diffBonus : undefined,
      blockAllEnemies: a.blockAllEnemies ? a.blockAllEnemies + diffBonus : undefined,
      blockFrontRow: a.blockFrontRow ? a.blockFrontRow + diffBonus : undefined,
      blockSelf: a.blockSelf ? a.blockSelf + diffBonus : undefined,
    }));
    // Determine starting block from blockSelf action (e.g., Cheruscan Guardian)
    let startBlock = 0;
    if (data.startWithSelfBlock) {
      const selfBlockAction = scaledActions.find(a => a.blockSelf);
      if (selfBlockAction) startBlock = selfBlockAction.blockSelf;
    }
    const enemy = {
      index: this.spawnIndex,
      ...data,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
      actions: scaledActions,
      dead: false,
      poison: 0,
      block: startBlock,
      justSpawned: true,
    };
    this.enemies.push(enemy);
    this.addLog(`${enemy.name} appears!${startBlock > 0 ? ` (${startBlock} Block)` : ''}`);

    // Runecarver: grant block to all other enemies when spawning (scales with difficulty)
    if (data.startBlockAllEnemies) {
      const scaledStartBlock = data.startBlockAllEnemies + diffBonus;
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + scaledStartBlock;
        }
      });
      this.addLog(`${enemy.name} carves runes — all enemies gain ${scaledStartBlock} Block!`);
    }

    this.spawnIndex++;
    this.update();
    setTimeout(() => {
      enemy.justSpawned = false;
      this.spawnNextEnemy();
    }, 500);
  }

  // --- Logging ---
  addLog(text) {
    this.log.push(text);
    if (this.log.length > 50) this.log.shift();
  }

  // --- Phase management ---
  // Calculate renown earned from a completed encounter
  calculateRenown() {
    const baseRenown = this.killedEnemies.reduce((sum, eid) => {
      const data = ENEMY_DATA[eid];
      return sum + (data ? (data.xpValue || 0) * 2 : 0);
    }, 0);
    const bonusMultiplier = Math.max(0.5, 1.5 - (this.turnCount * 0.1));
    // Active curses increase renown yield by their individual bonus percentages
    const activeCurses = this.getActiveCurses();
    const curseBonus = activeCurses.reduce((sum, cid) => {
      const def = typeof CURSE_DEFS !== 'undefined' ? CURSE_DEFS.find(c => c.id === cid) : null;
      return sum + (def ? def.renown / 100 : 0.15);
    }, 0);
    const curseMultiplier = 1 + curseBonus;
    return Math.round(baseRenown * bonusMultiplier * curseMultiplier);
  }

  startRollPhase() {
    // Safety: check if all enemies already dead before starting new turn
    this.checkEnemyDeaths();
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
      this.triggerVictory();
      return;
    }

    this.turn++;
    this.turnCount++;
    this.phase = PHASE.ROLLING;

    // Poison tick on enemies
    this.enemies.forEach(e => {
      if (!e.dead && e.poison > 0) {
        const poisonDmg = e.poison;
        e.hp = Math.max(0, e.hp - poisonDmg);
        this.addLog(`${e.name} takes ${poisonDmg} poison damage.`);
        if (this.onVisual) this.onVisual('enemyAttack', { enemyIndex: e.index, type: 'poison' });
        e.poison = Math.max(0, e.poison - 1);
        if (e.hp <= 0) {
          e.dead = true; e.hp = 0; this.killedEnemies.push(e.id); this.totalEnemiesKilled++;
          this.addLog(`${e.name} falls to poison!`);
          // Serpent's Coil: spread 2 poison to all other enemies on poison kill
          if (this.partyHasItem('serpents_coil')) {
            this.enemies.forEach(other => {
              if (!other.dead && other !== e) other.poison = (other.poison || 0) + 2;
            });
            this.addLog("Serpent's Coil spreads venom! (+2 Poison to all enemies)");
          }
          // Corpsebloom: heal all allies when enemy dies from poison (scales with level)
          if (this.partyHasItem('corpsebloom')) {
            const cbLv = this.getPartyItemLevel('corpsebloom');
            const cbHeal = 1 * cbLv;
            this.party.forEach(u => {
              if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + cbHeal);
            });
            this.addLog(`Corpsebloom blooms — all allies heal ${cbHeal} HP!`);
          }
        }
      }
    });
    // Check if all enemies died to poison
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
      this.triggerVictory();
      return;
    }
    // Poison tick on allies
    this.party.forEach(u => {
      if (!u.downed && u.poison > 0) {
        const poisonDmg = u.poison;
        u.hp = Math.max(1, u.hp - poisonDmg);
        this.addLog(`${u.name} takes ${poisonDmg} poison damage.`);
        if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: poisonDmg, type: 'poison' });
        u.poison = Math.max(0, u.poison - 1);
      }
    });

    // Structure aura damage (Wicker Man: turnDamageAll)
    this.enemies.forEach(e => {
      if (!e.dead && e.turnDamageAll) {
        this.party.forEach(u => {
          if (!u.downed) {
            u.hp = Math.max(1, u.hp - e.turnDamageAll);
            u.stats.damageTaken += e.turnDamageAll;
            if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: e.turnDamageAll, type: 'burn' });
          }
        });
        this.addLog(`${e.name} burns — all soldiers take ${e.turnDamageAll} damage!`);
      }
      // Healing Totem: heals the boss each turn
      if (!e.dead && e.healBoss) {
        const boss = this.enemies.find(b => b.id === e.healBossId && !b.dead);
        if (boss) {
          const healAmt = Math.min(e.healBoss, boss.maxHp - boss.hp);
          if (healAmt > 0) {
            boss.hp += healAmt;
            this.addLog(`${e.name} heals ${boss.name} for ${healAmt} HP.`);
          }
        }
      }
    });

    // Morale decay — escalates each turn. Turn 1: -1, Turn 2: -2, etc.
    // Difficulty adds +1 base decay per level above 1 (diff 2 = +1, diff 3 = +2, etc.)
    // Champion's Helm reduces decay by 1 per helm equipped
    // Curse: Witch's Gaze — morale decay +2 per turn
    const helmReduction = this.party.filter(u => !u.downed && this.unitHasItem(u, 'champions_helm')).length;
    const diffDecay = Math.max(0, (this.difficulty || 1) - 1);
    const curseDecay = this.getActiveCurses().includes('witchs_gaze') ? 2 : 0;
    const moraleDecay = Math.max(0, this.turn + diffDecay + curseDecay - helmReduction);
    this.morale = Math.max(-100, this.morale - moraleDecay);
    if (moraleDecay > 0) {
      this.addLog(`The forest weighs on your men. (-${moraleDecay} Morale)`);
      if (this.onVisual) this.onVisual('morale', { amount: -moraleDecay });
    }

    // Special: Wicker Ash — enemies take 1 damage per ash equipped at start of turn
    const wickerAshCount = this.party.filter(u => !u.downed && this.unitHasItem(u, 'wicker_ash')).length;
    if (wickerAshCount > 0) {
      this.enemies.forEach(e => {
        if (!e.dead) {
          e.hp = Math.max(0, e.hp - wickerAshCount);
        }
      });
      this.addLog(`Wicker ash burns — all enemies take ${wickerAshCount} damage.`);
      this.checkEnemyDeaths();
    }

    // Herb Pouch: heal wielder each turn (scales with level)
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'herb_pouch') && u.hp < u.maxHp) {
        const hpLv = this.getItemLevel(u, 'herb_pouch');
        const hpHeal = 1 * hpLv;
        u.hp = Math.min(u.maxHp, u.hp + hpHeal);
        this.addLog(`${u.name}'s Herb Pouch heals ${hpHeal} HP.`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: u.index, amount: hpHeal });
      }
    });

    // Eagle of the Lost Ninth: on turn 7, deal 20 damage to all enemies
    if (this.turn === 7 && !this._eagleUsed && this.partyHasItem('eagle_lost_ninth')) {
      this._eagleUsed = true;
      this.enemies.forEach(e => {
        if (!e.dead) e.hp = Math.max(0, e.hp - 20);
      });
      this.addLog('The Eagle of the Lost Ninth awakens — 20 damage to all enemies!');
      this.checkEnemyDeaths();
      if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
        this.triggerVictory();
        return;
      }
    }

    this.party.forEach(u => {
      if (this.turn > 1) {
        // Varus's Shield: retain up to 5 block between turns
        if (this.unitHasItem(u, 'varus_shield')) {
          u.block = Math.min(u.block || 0, 5);
        } else {
          u.block = 0;
        }
      }
      u.taunt = false;
      u._counterStance = 0;
      u._overwatch = 0;
      // Scout's Leather: bonus damage if not hit last turn (scales with level)
      if (this.turn > 1 && this.unitHasItem(u, 'scouts_leather')) {
        const slLv = this.getItemLevel(u, 'scouts_leather');
        const slBonus = 3 + (slLv - 1);
        if (!u._wasHitThisTurn) {
          if (u._scoutsLeatherActive) u.equipDamage -= u._scoutsLeatherBonus || 3;
          u._scoutsLeatherActive = true;
          u._scoutsLeatherBonus = slBonus;
          u.equipDamage += slBonus;
          this.addLog(`${u.name}'s Scout's Leather grants +${slBonus} damage (untouched).`);
        } else if (u._scoutsLeatherActive) {
          u._scoutsLeatherActive = false;
          u.equipDamage -= u._scoutsLeatherBonus || 3;
          u._scoutsLeatherBonus = 0;
        }
      }
      u._wasHitThisTurn = false;
      u._damageShield = 0;
      u._intercept = false;
      // Bone Totem stun: skip this turn
      if (u._stunNextTurn) {
        u.actedThisTurn = true;
        u._stunNextTurn = false;
        this.addLog(`${u.name} is stunned and cannot act!`);
      } else {
        u.actedThisTurn = false;
      }
    });
    // Clear per-turn enemy effects
    this.enemies.forEach(e => {
      if (!e.dead) {
        e._smokeScreen = 0;
        e._snareTrap = 0;
      }
    });
    this.dicePool.adjustUsed = false;
    this.dicePool.rerollUsed = false;
    this.dicePool.itemAdjustUsed = false;
    this.dicePool.itemRerollUsed = false;
    this._ambushTargeted = null; // clear ambush spread tracking

    // Tick down skill cooldowns
    this.party.forEach(u => {
      u.skills.forEach(s => {
        if (s.cooldownLeft && s.cooldownLeft > 0) s.cooldownLeft--;
      });
    });
    this.targetMode = null;
    this.addLog(`\u2014 Turn ${this.turn} \u2014`);

    // Roll dice — base 4 + extra from equipment
    let extraDice = this.getExtraDiceCount();
    // Pact of Wolves: +1 die every 3rd turn
    if (this.partyHasItem('pact_of_wolves') && this.turn > 0 && this.turn % 3 === 0) {
      extraDice++;
      this.addLog('The Pact of Wolves grants an extra die!');
    }
    // Moonstone Ring: +1 die if morale > 50
    if (this.partyHasItem('moonstone_ring') && this.morale > 50) {
      extraDice++;
      this.addLog('Moonstone Ring shines — morale grants an extra die!');
    }
    // Heartwood Charm: +3 dice next turn after first damage taken
    if (this._heartwoodBonusDice) {
      extraDice += this._heartwoodBonusDice;
      this.addLog(`Heartwood Charm grants ${this._heartwoodBonusDice} extra dice!`);
      this._heartwoodBonusDice = 0;
    }
    // Event bonus dice (from event choices)
    if (this._eventBonusDice) {
      extraDice += this._eventBonusDice;
      this.addLog(`Event bonus: +${this._eventBonusDice} extra dice this combat!`);
      this._eventBonusDice = 0;
    }
    // Curse: Golden Challenge — start with 1 fewer die
    const curseDiceReduction = this.getActiveCurses().includes('golden_challenge') ? 1 : 0;
    this.dicePool.count = Math.max(1, 4 + extraDice - curseDiceReduction);
    this.dicePool.roll();
    this.update();
  }

  onDiceRevealed() {
    // Called by UI after all dice are shown
    this.phase = PHASE.PLAYER_TURN;
    const vals = this.dicePool.dice.map(d => d.value).join(', ');
    this.addLog(`Dice: [${vals}]`);

    // Silent Huntsman: destroy an odd die every 2 turns (after player rolls)
    const huntsman = this.enemies.find(e => e.id === 'silent_huntsman' && !e.dead);
    if (huntsman && this.turn % 2 === 0) {
      const oddDice = this.dicePool.dice.filter(d => !d.used && d.value % 2 === 1);
      if (oddDice.length > 0) {
        const victim = oddDice[Math.floor(Math.random() * oddDice.length)];
        this.dicePool.useDie(victim.id);
        this.addLog(`The Huntsman's arrow shatters a die! (${victim.value} destroyed)`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    }

    // Dice passives trigger on rolled values
    this.processDicePassives();

    // Roll enemy intents on first turn (subsequent turns get them at end of enemy turn)
    if (this.turn === 1 || !this.enemies.some(e => e._intent)) {
      this.rollEnemyIntents();
    }

    this.update();
  }

  processDicePassives() {
    const hasMedicus = this.party.some(u => u.classId === 'medicus' && !u.downed);
    const hasSagittarius = this.party.some(u => u.classId === 'sagittarius' && !u.downed);
    const legionary = this.party.find(u => u.classId === 'legionary' && !u.downed);

    const triggeredDice = []; // { dieId, type } for UI flash

    for (const die of this.dicePool.dice) {
      // Medicus: heal random damaged ally on each 1 (scales with difficulty)
      if (die.value === 1 && hasMedicus) {
        const damaged = this.party.filter(u => !u.downed && u.hp < u.maxHp);
        if (damaged.length > 0) {
          const passiveHeal = Math.max(1, (this.difficulty || 1));
          const target = damaged[Math.floor(Math.random() * damaged.length)];
          target.hp = Math.min(target.maxHp, target.hp + passiveHeal);
          this.addLog(`Healer's Instinct: ${target.name} healed ${passiveHeal} HP.`);
          if (this.onVisual) this.onVisual('unitHeal', { unitIndex: target.index, amount: passiveHeal });
          triggeredDice.push({ dieId: die.id, type: 'heal' });
        }
      }

      // Sagittarius: damage random enemy on each 6 (scales with difficulty)
      if (die.value === 6 && hasSagittarius) {
        const alive = this.enemies.filter(e => !e.dead);
        if (alive.length > 0) {
          const passiveDmg = Math.max(1, (this.difficulty || 1));
          const target = alive[Math.floor(Math.random() * alive.length)];
          target.hp = Math.max(0, target.hp - passiveDmg);
          this.addLog(`Eagle Eye: ${target.name} takes ${passiveDmg} damage.`);
          triggeredDice.push({ dieId: die.id, type: 'damage' });
        }
      }
    }

    // Legionary: Disciplined Formation — gain +2 Block on natural pairs
    if (legionary) {
      const values = this.dicePool.dice.map(d => d.value);
      const seen = {};
      const pairValues = [];
      values.forEach((v, i) => {
        if (seen[v] !== undefined && !pairValues.includes(v)) {
          pairValues.push(v);
          triggeredDice.push({ dieId: this.dicePool.dice[seen[v]].id, type: 'block' });
          triggeredDice.push({ dieId: this.dicePool.dice[i].id, type: 'block' });
        }
        if (seen[v] === undefined) seen[v] = i;
      });
      if (pairValues.length > 0) {
        const blockGain = pairValues.length * 2;
        legionary.block = (legionary.block || 0) + blockGain;
        this.addLog(`Disciplined Formation: ${legionary.name} gains ${blockGain} Block (${pairValues.length} pair${pairValues.length > 1 ? 's' : ''}).`);
        if (this.onVisual) this.onVisual('unitBlock', { unitIndex: legionary.index, amount: blockGain });
      }
    }

    // Notify UI about triggered dice for flashing
    if (triggeredDice.length > 0 && this.onVisual) {
      this.onVisual('dicePassive', { triggers: triggeredDice });
    }

    // Check if any enemy died from Sagittarius passive
    this.checkEnemyDeaths();
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
      this.triggerVictory();
    }
  }

  // --- Centurion passive / Seer's Knucklebone ---
  canAdjustDie() {
    if (!this.dicePool.adjustUsed && this.morale < 50 && this.party.some(u => u.classId === 'centurion' && !u.downed)) return true;
    if (!this.dicePool.itemAdjustUsed && this.partyHasItem('seers_knucklebone')) return true;
    return false;
  }

  adjustDie(dieId, direction) {
    if (!this.canAdjustDie()) return false;
    const die = this.dicePool.dice.find(d => d.id === dieId);
    if (!die || die.used) return false;
    const newVal = die.value + direction;
    if (newVal < 1 || newVal > 6) return false;
    const oldVal = die.value;
    die.value = newVal;

    // Use class passive first, then item
    const hasCenturion = !this.dicePool.adjustUsed && this.morale < 50 && this.party.some(u => u.classId === 'centurion' && !u.downed);
    if (hasCenturion) {
      this.dicePool.adjustUsed = true;
      this.addLog(`Centurion adjusts die: ${oldVal} \u2192 ${die.value}`);
    } else {
      this.dicePool.itemAdjustUsed = true;
      this.addLog(`Seer's Knucklebone adjusts die: ${oldVal} \u2192 ${die.value}`);
    }
    this.update();
    return true;
  }

  // --- Skill system ---
  getValidSkills(unitIndex) {
    const unit = this.party[unitIndex];
    if (!unit || unit.downed || unit.actedThisTurn) return [];
    const available = this.dicePool.getAvailable();

    return unit.skills.map(skill => {
      const canUse = this.canUseSkill(unitIndex, skill, available);
      return { ...skill, canUse };
    });
  }

  canUseSkill(unitIndex, skill, available) {
    // Cooldown check
    if (skill.cooldownLeft && skill.cooldownLeft > 0) return false;

    // Revive skills need a downed ally (not self)
    if (skill.effects && skill.effects.revive) {
      const self = this.party[unitIndex];
      if (!this.party.some(u => u.downed && u !== self)) return false;
    }

    // Morale cost skills need enough morale
    if (skill.effects && skill.effects.moraleCost) {
      if (this.morale < skill.effects.moraleCost) return false;
    }

    // Disable pure heal skills when nobody is damaged
    const eff = skill.effects || {};
    const isHealOnly = (eff.heal || eff.healAll) &&
      !eff.damage && !eff.damageAll && !eff.poison && !eff.poisonAll &&
      !eff.block && !eff.blockAll && !eff.morale && !eff.buffAllies &&
      !eff.cleanse && !eff.taunt && !eff.markTarget;
    if (isHealOnly) {
      const anyDamaged = this.party.some(u => !u.downed && u.hp < u.maxHp);
      if (!anyDamaged) return false;
    }

    if (!available) available = this.dicePool.getAvailable();
    const cost = skill.cost;
    switch (cost.type) {
      case 'any':
        return available.length >= 1;
      case 'threshold':
        return available.some(d => d.value >= cost.min);
      case 'range':
        return available.some(d => d.value >= cost.min && d.value <= cost.max);
      case 'exact':
        return available.some(d => d.value === cost.val);
      case 'combined':
        return this.findCombinedDice(available, cost.dice, cost.min, '>=');
      case 'combinedExact':
        return this.findCombinedDice(available, cost.dice, cost.val, '===');
      case 'even':
        return available.some(d => d.value % 2 === 0);
      case 'odd':
        return available.some(d => d.value % 2 === 1);
      case 'pair': {
        const vals = {};
        for (const d of available) { vals[d.value] = (vals[d.value] || 0) + 1; }
        return Object.values(vals).some(c => c >= 2);
      }
      case 'pairEven': {
        const evens = {};
        for (const d of available) { if (d.value % 2 === 0) evens[d.value] = (evens[d.value] || 0) + 1; }
        return Object.values(evens).some(c => c >= 2);
      }
      case 'pairOdd': {
        const odds = {};
        for (const d of available) { if (d.value % 2 === 1) odds[d.value] = (odds[d.value] || 0) + 1; }
        return Object.values(odds).some(c => c >= 2);
      }
      case 'oddEven': {
        const hasOdd = available.some(d => d.value % 2 === 1);
        const hasEven = available.some(d => d.value % 2 === 0);
        return hasOdd && hasEven;
      }
      case 'consecutive': {
        const vals = [...new Set(available.map(d => d.value))].sort((a, b) => a - b);
        for (let i = 0; i < vals.length - 1; i++) {
          if (vals[i + 1] - vals[i] === 1) return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  // Auto-pick the best dice for a skill cost
  autoPick(skill) {
    const available = this.dicePool.getAvailable();
    const cost = skill.cost;

    switch (cost.type) {
      case 'any': {
        if (available.length === 0) return [];
        // Pick highest die if skill scales with die value, lowest otherwise
        const hasDieScale = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        if (hasDieScale) {
          return [available.reduce((max, d) => d.value > max.value ? d : max, available[0]).id];
        }
        return [available.reduce((min, d) => d.value < min.value ? d : min, available[0]).id];
      }
      case 'threshold': {
        const hasDieScaleT = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        const validT = available.filter(d => d.value >= cost.min).sort((a, b) => hasDieScaleT ? b.value - a.value : a.value - b.value);
        return validT.length > 0 ? [validT[0].id] : [];
      }
      case 'range': {
        const hasDieScaleR = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        const validR = available.filter(d => d.value >= cost.min && d.value <= cost.max).sort((a, b) => hasDieScaleR ? b.value - a.value : a.value - b.value);
        return validR.length > 0 ? [validR[0].id] : [];
      }
      case 'exact':
        const exact = available.find(d => d.value === cost.val);
        return exact ? [exact.id] : [];
      case 'combined': {
        const hasDieScaleC = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        let bestPair = null;
        let bestSum = hasDieScaleC ? -Infinity : Infinity;
        for (let i = 0; i < available.length; i++) {
          for (let j = i + 1; j < available.length; j++) {
            const sum = available[i].value + available[j].value;
            if (sum >= cost.min && (hasDieScaleC ? sum > bestSum : sum < bestSum)) {
              bestSum = sum;
              bestPair = [available[i].id, available[j].id];
            }
          }
        }
        return bestPair || [];
      }
      case 'combinedExact': {
        for (let i = 0; i < available.length; i++) {
          for (let j = i + 1; j < available.length; j++) {
            if (available[i].value + available[j].value === cost.val) {
              return [available[i].id, available[j].id];
            }
          }
        }
        return [];
      }
      case 'even': {
        // Pick highest even die (more block/damage from die value scaling)
        const evens = available.filter(d => d.value % 2 === 0).sort((a, b) => b.value - a.value);
        return evens.length > 0 ? [evens[0].id] : [];
      }
      case 'odd': {
        // Pick highest odd die
        const odds = available.filter(d => d.value % 2 === 1).sort((a, b) => b.value - a.value);
        return odds.length > 0 ? [odds[0].id] : [];
      }
      case 'pair': {
        // Find lowest value pair
        const sorted = [...available].sort((a, b) => a.value - b.value);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].value === sorted[i + 1].value) {
            return [sorted[i].id, sorted[i + 1].id];
          }
        }
        return [];
      }
      case 'pairEven': {
        // Find highest even pair
        const sortedE = [...available].filter(d => d.value % 2 === 0).sort((a, b) => b.value - a.value);
        for (let i = 0; i < sortedE.length - 1; i++) {
          if (sortedE[i].value === sortedE[i + 1].value) {
            return [sortedE[i].id, sortedE[i + 1].id];
          }
        }
        return [];
      }
      case 'pairOdd': {
        // Find highest odd pair
        const sortedO = [...available].filter(d => d.value % 2 === 1).sort((a, b) => b.value - a.value);
        for (let i = 0; i < sortedO.length - 1; i++) {
          if (sortedO[i].value === sortedO[i + 1].value) {
            return [sortedO[i].id, sortedO[i + 1].id];
          }
        }
        return [];
      }
      case 'oddEven': {
        // Pick lowest odd + lowest even
        const oddD = available.filter(d => d.value % 2 === 1).sort((a, b) => a.value - b.value);
        const evenD = available.filter(d => d.value % 2 === 0).sort((a, b) => a.value - b.value);
        return (oddD.length > 0 && evenD.length > 0) ? [oddD[0].id, evenD[0].id] : [];
      }
      case 'consecutive': {
        // Find lowest consecutive pair
        const sortedC = [...available].sort((a, b) => a.value - b.value);
        for (let i = 0; i < sortedC.length - 1; i++) {
          if (sortedC[i + 1].value - sortedC[i].value === 1) {
            return [sortedC[i].id, sortedC[i + 1].id];
          }
        }
        return [];
      }
      default:
        return [];
    }
  }

  findCombinedDice(available, count, target, op) {
    if (available.length < count) return false;
    if (count === 2) {
      for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
          const sum = available[i].value + available[j].value;
          if (op === '>=' && sum >= target) return true;
          if (op === '===' && sum === target) return true;
        }
      }
    }
    return false;
  }

  // --- Targeting ---
  beginSkillTarget(unitIndex, skillId, diceIds) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);
    if (!skill) return;

    if (!this.dicePool.canPayCost(skill.cost, diceIds)) {
      this.addLog('Invalid dice for this skill.');
      this.update();
      return;
    }

    if (skill.target === TARGET.SINGLE_ENEMY) {
      const validTargets = this.getValidEnemyTargets(skill, unit);
      if (validTargets.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [validTargets[0]]);
      } else if (validTargets.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'enemy' };
        this.update();
      }
    } else if (skill.target === TARGET.DUAL_ENEMY) {
      const validTargets = this.getValidEnemyTargets(skill, unit);
      if (validTargets.length === 1) {
        // Only one target — hit it twice
        this.executeSkill(unitIndex, skillId, diceIds, [validTargets[0], validTargets[0]]);
      } else if (validTargets.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'dual_enemy', selectedTargets: [] };
        this.update();
      }
    } else if (skill.target === TARGET.SINGLE_ALLY) {
      const isRevive = skill.effects && skill.effects.revive;
      const unit = this.party[unitIndex];
      const aliveAllies = isRevive ? this.party.filter(u => u.downed && u !== unit) : this.party.filter(u => !u.downed);
      if (aliveAllies.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [aliveAllies[0]]);
      } else if (aliveAllies.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: isRevive ? 'ally_downed' : 'ally' };
        this.update();
      }
    } else {
      this.executeSkill(unitIndex, skillId, diceIds, []);
    }
  }

  selectTarget(target) {
    if (!this.targetMode) return;
    const { unitIndex, skillId, diceIds } = this.targetMode;

    // Dual enemy targeting: collect two targets
    if (this.targetMode.targetType === 'dual_enemy') {
      this.targetMode.selectedTargets.push(target);
      if (this.targetMode.selectedTargets.length >= 2) {
        const targets = this.targetMode.selectedTargets;
        this.targetMode = null;
        this.executeSkill(unitIndex, skillId, diceIds, targets);
      } else {
        this.update();
      }
      return;
    }

    this.executeSkill(unitIndex, skillId, diceIds, [target]);
    this.targetMode = null;
  }

  cancelTarget() {
    this.targetMode = null;
    this.update();
  }

  getValidEnemyTargets(skill, unit) {
    const alive = this.enemies.filter(e => !e.dead);
    if (skill.ignoreRow) return alive;
    // Huntsman's Arrow: attacks can target any row
    if (unit && this.unitHasItem(unit, 'huntsmans_arrow')) return alive;
    const front = alive.filter(e => e.row === 'front');
    if (front.length > 0) return front;
    return alive;
  }

  executeSkill(unitIndex, skillId, diceIds, targets) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);

    // Track skill usage for analytics
    if (!this.skillUsageStats) this.skillUsageStats = {};
    const key = `${unit.classId}:${skillId}`;
    this.skillUsageStats[key] = (this.skillUsageStats[key] || 0) + 1;

    const usedDice = diceIds.map(id => this.dicePool.dice.find(d => d.id === id));
    diceIds.forEach(id => this.dicePool.useDie(id));
    const result = skill.execute(unit, targets, usedDice);

    // Overrun: bonus damage for each other die in the roll matching the used die's value
    if (result.overrun && usedDice.length === 1 && usedDice[0]) {
      const matchVal = usedDice[0].value;
      const extraMatches = this.dicePool.dice.filter(d => d !== usedDice[0] && d.value === matchVal).length;
      if (extraMatches > 0) {
        const overrunBonus = extraMatches * (1 + (this.difficulty || 1));
        result.damage = (result.damage || 0) + overrunBonus;
        result._overrunBonus = overrunBonus;
      }
    }

    // Mars's Denarius: every 5th skill used doubles all numeric effects
    if (!this._marsSkillCount) this._marsSkillCount = 0;
    if (this.partyHasItem('mars_denarius')) {
      this._marsSkillCount++;
      if (this._marsSkillCount % 5 === 0) {
        if (result.damage) result.damage *= 2;
        if (result.heal) result.heal *= 2;
        if (result.healAll) result.healAll *= 2;
        if (result.block) result.block *= 2;
        if (result.blockAll) result.blockAll *= 2;
        if (result.poison) result.poison *= 2;
        if (result.poisonAll) result.poisonAll *= 2;
        this.addLog("Mars's Denarius — DOUBLE EFFECT!");
        if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Mars!', color: '#cc44ff' });
      }
    }

    // Set cooldown
    if (skill.cooldown) {
      skill.cooldownLeft = skill.cooldown + 1;
    }

    const logText = this.applySkillResult(unit, skill, result);
    this.addLog(logText);

    // Gladiator's Wraps: gain block after using a 2+ dice skill (scales with level)
    if (diceIds.length >= 2 && this.unitHasItem(unit, 'gladiators_wraps')) {
      const gwLv = this.getItemLevel(unit, 'gladiators_wraps');
      const gwBlock = 3 + (gwLv - 1);
      unit.block = (unit.block || 0) + gwBlock;
      this.addLog(`Gladiator's Wraps grant ${unit.name} ${gwBlock} Block.`);
      if (this.onVisual) this.onVisual('unitBlock', { unitIndex: unit.index, amount: gwBlock });
    }

    // Mark unit as acted
    unit.actedThisTurn = true;

    this.checkEnemyDeaths();
    this.processBossPhases();
    if (this.enemies.every(e => e.dead)) {
      this.triggerVictory();
      return;
    }

    // Auto-end turn if all alive units have acted or can't act
    if (this.shouldAutoEndTurn()) {
      this.update();
      setTimeout(() => this.endPlayerTurn(), 400);
      return;
    }

    this.update();
  }

  // Check if any alive enemy has a damage reduction aura protecting the target
  getAuraDamageReduction(target) {
    let reduction = 0;
    this.enemies.forEach(e => {
      if (!e.dead && e.aura && e.aura.damageReduction && e !== target) {
        reduction += e.aura.damageReduction;
      }
    });
    return reduction;
  }

  consumeBuffDamage(unit) {
    let total = 0;
    for (let i = unit.buffs.length - 1; i >= 0; i--) {
      const b = unit.buffs[i];
      if (b.damage) {
        total += b.damage;
        b.attacksLeft--;
        if (b.attacksLeft <= 0) unit.buffs.splice(i, 1);
      }
    }
    return total;
  }

  applySkillResult(unit, skill, result) {
    const parts = [];
    // Morale modifier: +1/+2 damage at high morale, -1/-2 at low (also affects healing)
    let moraleMod = 0;
    if (this.morale >= 75) moraleMod = 2;
    else if (this.morale >= 50) moraleMod = 1;
    else if (this.morale <= -75) moraleMod = -2;
    else if (this.morale <= -50) moraleMod = -1;
    // Consume buff damage only when actually dealing damage
    const isDealingDamage = (result.damage && result.target) || result.damageAll;
    const buffDmg = isDealingDamage ? this.consumeBuffDamage(unit) : 0;
    let bonusDmg = buffDmg + (unit.equipDamage || 0) + moraleMod;

    // Equites passive: Cavalry Charge — first attack each encounter deals +50% damage
    let chargeBonus = 0;
    if (isDealingDamage && unit.classId === 'equites' && !unit.passiveTriggered) {
      const baseDmg = result.damage || result.damageAll || 0;
      chargeBonus = Math.floor(baseDmg * 0.5);
      bonusDmg += chargeBonus;
      unit.passiveTriggered = true;
      parts.push('Cavalry Charge!');
    }

    const bonusBlock = unit.equipBlock || 0;
    const bonusHeal = (unit.equipHeal || 0) + moraleMod;

    if (result.damage && result.target && result.target.hp !== undefined) {
      // Morale Scaling: damage scales from 1x at -100 morale to 2.5x at 100 morale
      let scaledDamage = result.damage;
      if (result.moraleScaling) {
        // Linear scale: morale -100 = 0.5x, 0 = 1.0x, 100 = 2.5x
        const moraleNorm = (this.morale + 100) / 200; // 0 to 1
        const scale = 0.5 + moraleNorm * 2.0; // 0.5 to 2.5
        scaledDamage = Math.round(result.damage * scale);
        if (scale > 1.05) parts.push(`Morale fuels the charge! (x${scale.toFixed(1)})`);
      }
      // Half bonus damage: light strikes only get half equipment/buff bonus
      const effectiveBonusDmg = result.halfBonusDmg ? Math.floor(bonusDmg / 2) : bonusDmg;
      // Overrun: log bonus from matching dice
      if (result._overrunBonus) {
        parts.push(`Overrun! (+${result._overrunBonus})`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Overrun!', color: 'var(--gold)' });
      }
      // Split damage: calculate total first, then halve for each target
      let total = (result.splitDamage ? Math.floor((scaledDamage + effectiveBonusDmg) / 2) : scaledDamage + effectiveBonusDmg);
      // Mark Target: +20% damage to marked enemies
      if (result.target._marked && result.target._marked > 0) {
        total = Math.round(total * 1.2);
        parts.push('Marked! (+20%)');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Marked!', color: 'var(--red-bright)' });
      }
      // Condemn: +30% damage from all sources
      if (result.target._condemned && result.target._condemned > 0) {
        total = Math.round(total * 1.3);
        parts.push('Condemned! (+30%)');
      }
      // Night Owl Pendant: +bonus damage vs back-row enemies (scales with level)
      if (result.target.row === 'back' && this.unitHasItem(unit, 'night_owl_pendant')) {
        const nopLv = this.getItemLevel(unit, 'night_owl_pendant');
        const nopBonus = 2 + (nopLv - 1);
        total += nopBonus;
        parts.push(`Night Owl Pendant! (+${nopBonus} vs back row)`);
      }
      // Execute: double damage to enemies below 25% HP
      if (result.execute && result.target.hp <= result.target.maxHp * 0.25) {
        total *= 2;
        parts.push('EXECUTE!');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Execute!', color: 'var(--red-bright)' });
      }
      // Kill Shot: double damage to marked or poisoned targets
      if (result.killShot && ((result.target._marked && result.target._marked > 0) || (result.target.poison && result.target.poison > 0))) {
        total *= 2;
        parts.push('Kill Shot!');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Kill Shot!', color: 'var(--red-bright)' });
      }
      // Aura damage reduction (e.g. Wicker Man protects other enemies)
      const auraReduction = this.getAuraDamageReduction(result.target);
      if (auraReduction > 0) total = Math.max(1, total - auraReduction);
      // Pierce block: reduce effective block before absorbing
      let pierceAmount = result.pierceBlock || 0;
      // Enemy block (Warlord's Blade deals 2 extra damage to block)
      if (result.target.block && result.target.block > 0) {
        let effectiveBlock = Math.max(0, result.target.block - pierceAmount);
        let blockDmg = total;
        if (this.unitHasItem(unit, 'warlords_blade')) blockDmg += 2;
        if (this.unitHasItem(unit, 'scorpio_crossbow')) {
          const scLv = this.getItemLevel(unit, 'scorpio_crossbow');
          blockDmg += 5 + (scLv - 1) * 2;
        }
        const absorbed = Math.min(effectiveBlock, blockDmg);
        result.target.block = Math.max(0, result.target.block - absorbed - pierceAmount);
        total -= Math.min(total, absorbed);
        if (absorbed > 0) parts.push(`${result.target.name}'s block absorbs ${absorbed}${pierceAmount > 0 ? ` (pierced ${pierceAmount})` : ''}.`);
      }
      result.target.hp = Math.max(0, result.target.hp - total);
      unit.stats.damageDealt += total;
      const bonusStr = bonusDmg !== 0 ? ` (${result.damage}${bonusDmg >= 0 ? '+' : ''}${bonusDmg}${auraReduction > 0 ? `-${auraReduction}aura` : ''})` : (auraReduction > 0 ? ` (-${auraReduction} aura)` : '');
      parts.push(`${unit.name} uses ${skill.name} on ${result.target.name} for ${total}${bonusStr} damage.`);

      // Ballistarius passive: Pinning Fire — target deals 15% less damage next action
      if (unit.classId === 'ballistarius' && total > 0 && result.target.hp > 0) {
        result.target._pinned = true;
      }

      // Special: Legion Composite Bow — attacks apply Poison (scales with level)
      if (this.unitHasItem(unit, 'legion_composite_bow') && total > 0 && result.target.hp > 0) {
        const lcbLv = this.getItemLevel(unit, 'legion_composite_bow');
        const lcbPoison = 1 * lcbLv;
        result.target.poison = (result.target.poison || 0) + lcbPoison;
        unit.stats.poisonInflicted += lcbPoison;
        parts.push(`The festering arrow poisons the target. (+${lcbPoison} Poison)`);
      }

      // Special: Venomous Blade — attacks apply Poison (scales with level)
      if (this.unitHasItem(unit, 'venomous_blade') && total > 0 && result.target.hp > 0) {
        const vbLv = this.getItemLevel(unit, 'venomous_blade');
        const vbPoison = 1 * vbLv;
        result.target.poison = (result.target.poison || 0) + vbPoison;
        unit.stats.poisonInflicted += vbPoison;
        parts.push(`Venomous Blade poisons the target. (+${vbPoison} Poison)`);
      }

      // Special: Blood-Iron Gladius — attacks heal wielder (scales with level)
      if (this.unitHasItem(unit, 'blood_iron_gladius') && total > 0 && unit.hp < unit.maxHp) {
        const bigLv = this.getItemLevel(unit, 'blood_iron_gladius');
        const bigHeal = 1 * bigLv;
        unit.hp = Math.min(unit.maxHp, unit.hp + bigHeal);
        unit.stats.healingDone += bigHeal;
        parts.push(`Blood-Iron Gladius heals ${bigHeal} HP.`);
      }

      // Arminius's Champion: 15% damage reflection
      if (result.target.id === 'arminius_champion' && total > 0 && result.target.hp > 0) {
        const reflected = Math.max(1, Math.floor(total * 0.15));
        unit.hp = Math.max(1, unit.hp - reflected);
        unit.stats.damageTaken += reflected;
        parts.push(`Champion's armor reflects ${reflected} damage!`);
      }

      // Splash: half damage to all other enemies
      if (result.splashHalf) {
        const halfDmg = Math.max(1, Math.floor((result.damage + bonusDmg) / 2));
        this.enemies.forEach(e => {
          if (!e.dead && e !== result.target) {
            let sDmg = halfDmg;
            const sAura = this.getAuraDamageReduction(e);
            if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
            if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
            e.hp = Math.max(0, e.hp - sDmg);
            unit.stats.damageDealt += sDmg;
          }
        });
        parts.push(`Splash deals ${halfDmg} to other enemies.`);
      }

      // Splash back row: half damage pierces to all back-row enemies
      if (result.splashBackRow) {
        const halfDmg = Math.max(1, Math.floor((result.damage + bonusDmg) / 2));
        const backRow = this.enemies.filter(e => !e.dead && e.row === 'back');
        backRow.forEach(e => {
          let sDmg = halfDmg;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (backRow.length > 0) parts.push(`The blast pierces to the back row for ${halfDmg} damage.`);
      }

      // Splash: damage to all enemies in same row as target
      if (result.splashRow && result.target.row) {
        const rowDmg = result.damage + bonusDmg;
        this.enemies.forEach(e => {
          if (!e.dead && e !== result.target && e.row === result.target.row) {
            let sDmg = rowDmg;
            const sAura = this.getAuraDamageReduction(e);
            if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
            if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
            e.hp = Math.max(0, e.hp - sDmg);
            unit.stats.damageDealt += sDmg;
          }
        });
        parts.push(`Hits all ${result.target.row}-row enemies.`);
      }

      // Pierce row: bolt passes through to hit the enemy directly behind the target
      if (result.pierceRow && result.target.row) {
        const otherRow = result.target.row === 'front' ? 'back' : 'front';
        const behind = this.enemies.filter(e => !e.dead && e.row === otherRow);
        if (behind.length > 0) {
          // Pick the one closest in index (visually behind)
          const victim = behind.reduce((closest, e) =>
            Math.abs(e.index - result.target.index) < Math.abs(closest.index - result.target.index) ? e : closest, behind[0]);
          let sDmg = result.damage + bonusDmg;
          const sAura = this.getAuraDamageReduction(victim);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (victim.block && victim.block > 0) { const ab = Math.min(victim.block, sDmg); victim.block -= ab; sDmg -= ab; }
          victim.hp = Math.max(0, victim.hp - sDmg);
          unit.stats.damageDealt += sDmg;
          parts.push(`Bolt pierces through to ${victim.name}!`);
        }
      }

      // Splash adjacent: damage enemies directly beside the target in the same row
      if (result.splashAdjacent && result.target.row) {
        const sameRow = this.enemies.filter(e => !e.dead && e.row === result.target.row && e !== result.target);
        // Sort by index to find the two closest
        sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
        adjacent.forEach(e => {
          let sDmg = result.splashAdjacent;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (adjacent.length > 0) parts.push(`Tramples ${adjacent.map(e => e.name).join(' and ')} for ${result.splashAdjacent} damage.`);
      }

      // Splash adjacent percentage: deal X% of total damage to adjacent enemies (min 2)
      if (result.splashAdjacentPct && result.target.row) {
        const trampleDmg = Math.max(2, Math.round(total * result.splashAdjacentPct));
        const sameRow = this.enemies.filter(e => !e.dead && e.row === result.target.row && e !== result.target);
        sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
        adjacent.forEach(e => {
          let sDmg = trampleDmg;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (adjacent.length > 0) parts.push(`Tramples ${adjacent.map(e => e.name).join(' and ')} for ${trampleDmg} damage.`);
      }

      // Knockback: shove front-row enemy to back row
      if (result.knockback && result.target.row === 'front') {
        result.target.row = 'back';
        parts.push(`${result.target.name} is knocked to the back row!`);
      }

      // Split damage: apply same halved damage to second target (bonuses already included in split)
      if (result.splitDamage && result.secondTarget && result.secondTarget.hp !== undefined) {
        let total2 = Math.floor((result.damage + bonusDmg) / 2);
        const aura2 = this.getAuraDamageReduction(result.secondTarget);
        if (aura2 > 0) total2 = Math.max(1, total2 - aura2);
        if (result.secondTarget.block && result.secondTarget.block > 0) {
          const absorbed2 = Math.min(result.secondTarget.block, total2);
          result.secondTarget.block -= absorbed2;
          total2 -= absorbed2;
        }
        result.secondTarget.hp = Math.max(0, result.secondTarget.hp - total2);
        unit.stats.damageDealt += total2;
        parts.push(`${unit.name} strikes ${result.secondTarget.name} for ${total2} damage.`);
        if (this.onVisual && result.secondTarget.index !== undefined) {
          this.onVisual('enemyAttack', { enemyIndex: result.secondTarget.index });
        }
      }
    }
    if (result.heal && result.target) {
      let totalHeal = result.heal + bonusHeal;
      // Resonance: double the heal
      if (result.target._resonance) {
        totalHeal *= 2;
        result.target._resonance = false;
        parts.push('Resonance doubles the heal!');
      }
      // Healer's Oath: healing below 25% HP heals double
      if (this.unitHasItem(unit, 'healers_oath') && result.target.hp <= result.target.maxHp * 0.25) {
        totalHeal *= 2;
        parts.push("Healer's Oath doubles the heal!");
      }
      const before = result.target.hp;
      result.target.hp = Math.min(result.target.maxHp, result.target.hp + totalHeal);
      const actual = result.target.hp - before;
      unit.stats.healingDone += actual;
      const bonusStr = bonusHeal > 0 ? ` (${result.heal}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals ${result.target.name} for ${actual}${bonusStr} HP.`);
      if (actual > 0 && this.onVisual) {
        this.onVisual('unitHeal', { unitIndex: result.target.index, amount: actual });
      }
      // Special: Marsh Fang — healing clears 1 poison from target
      if (this.unitHasItem(unit, 'marsh_fang') && result.target.poison > 0) {
        result.target.poison = Math.max(0, result.target.poison - 1);
        parts.push('Marsh Fang purges 1 poison.');
      }
      // Herbalist's Satchel: healing applies poison to random enemy (scales with level)
      if (this.unitHasItem(unit, 'herbalists_satchel') && actual > 0) {
        const hsLv = this.getItemLevel(unit, 'herbalists_satchel');
        const hsPoison = 1 * hsLv;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length > 0) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + hsPoison;
          parts.push(`Herbalist's Satchel poisons ${victim.name}. (+${hsPoison} Poison)`);
        }
      }
      // Marsh Root Brew: healing grants block to target (scales with level)
      if (this.unitHasItem(unit, 'marsh_root_brew') && actual > 0 && result.target) {
        const mrbLv = this.getItemLevel(unit, 'marsh_root_brew');
        const mrbBlock = 1 * mrbLv;
        result.target.block = (result.target.block || 0) + mrbBlock;
        parts.push(`Marsh Root Brew grants ${mrbBlock} Block.`);
      }
      // Crown of Thorns: when healed, deal damage to all enemies (scales with level)
      if (this.unitHasItem(result.target, 'crown_of_thorns') && actual > 0) {
        const cotLv = this.getItemLevel(result.target, 'crown_of_thorns');
        const cotDmg = 2 * cotLv;
        this.enemies.forEach(e => { if (!e.dead) e.hp = Math.max(0, e.hp - cotDmg); });
        parts.push(`Crown of Thorns — ${cotDmg} damage to all enemies!`);
      }
      // Bitter Remedy: when this unit is healed, poison a random enemy (scales with level)
      if (this.unitHasItem(result.target, 'bitter_remedy') && actual > 0) {
        const brLv = this.getItemLevel(result.target, 'bitter_remedy');
        const brPoison = 1 * brLv;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length > 0) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + brPoison;
          parts.push(`Bitter Remedy poisons ${victim.name}. (+${brPoison} Poison)`);
        }
      }
    }
    if (result.selfDamage) {
      const totalSelfDmg = result.selfDamage + (result.halfScaleSelfDamage ? Math.floor((unit.equipDamage || 0) / 2) : 0);
      unit.hp = Math.max(1, unit.hp - totalSelfDmg);
      unit.stats.damageTaken += totalSelfDmg;
      parts.push(`(${unit.name} takes ${totalSelfDmg} self-damage.)`);
    }
    if (result.block) {
      const blockTarget = result.blockTarget || result.target || unit;
      const totalBlock = result.block + bonusBlock;
      blockTarget.block = (blockTarget.block || 0) + totalBlock;
      unit.stats.blockGenerated += totalBlock;
      const bonusStr = bonusBlock > 0 ? ` (${result.block}+${bonusBlock})` : '';
      if (result.damage) {
        parts.push(`${unit.name} gains ${totalBlock} Block.`);
      } else if (!result.heal) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 ${totalBlock}${bonusStr} Block.`);
      }
      if (this.onVisual) this.onVisual('unitBlock', { unitIndex: blockTarget.index, amount: totalBlock });
      // Shieldbearer's Grip: grant block to a random other ally (scales with level)
      if (this.unitHasItem(unit, 'shieldbearers_grip')) {
        const sgLv = this.getItemLevel(unit, 'shieldbearers_grip');
        const sgBlock = 2 + (sgLv - 1);
        const others = this.party.filter(u => !u.downed && u !== unit);
        if (others.length > 0) {
          const ally = others[Math.floor(Math.random() * others.length)];
          ally.block = (ally.block || 0) + sgBlock;
          parts.push(`Shieldbearer's Grip spreads ${sgBlock} Block to ${ally.name}.`);
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: ally.index, amount: sgBlock });
        }
      }
      // Special: Oak Splinter — block skills grant +2 block to all other allies
      if (this.unitHasItem(unit, 'oak_splinter')) {
        this.party.forEach(u => {
          if (!u.downed && u !== result.target) {
            u.block = (u.block || 0) + 2;
            if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: 2 });
          }
        });
        parts.push('Oak Splinter spreads +2 Block to allies.');
      }
    }
    if (result.taunt) {
      unit.taunt = true;
      if (parts.length > 0) parts[parts.length - 1] += ' Taunting!';
    }
    if (result.blockAll) {
      const totalBlock = result.blockAll + bonusBlock;
      const recipients = this.party.filter(u => !u.downed && (!result.blockOthersOnly || u !== unit));
      const count = recipients.length;
      recipients.forEach(u => {
        u.block = (u.block || 0) + totalBlock;
        if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: totalBlock });
      });
      unit.stats.blockGenerated += totalBlock * count;
      // Shieldbearer's Grip: grant extra block to a random other ally on blockAll (scales with level)
      if (this.unitHasItem(unit, 'shieldbearers_grip')) {
        const sgLv2 = this.getItemLevel(unit, 'shieldbearers_grip');
        const sgBlock2 = 2 + (sgLv2 - 1);
        const others = this.party.filter(u => !u.downed && u !== unit);
        if (others.length > 0) {
          const ally = others[Math.floor(Math.random() * others.length)];
          ally.block = (ally.block || 0) + sgBlock2;
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: ally.index, amount: sgBlock2 });
        }
      }
      const bonusStr = bonusBlock > 0 ? ` (${result.blockAll}+${bonusBlock})` : '';
      if (!result.damage && !result.heal && !result.block) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 ${result.blockOthersOnly ? 'other allies' : 'all'} gain ${totalBlock}${bonusStr} Block.`);
      }
    }
    // Morale Heal All: heal all allies if morale is 50+
    if (result.moraleHealAll && this.morale >= 50) {
      const healAmt = result.moraleHealAll + bonusHeal;
      this.party.forEach(u => {
        if (!u.downed) {
          const actual = Math.min(healAmt, u.maxHp - u.hp);
          u.hp += actual;
          unit.stats.healingDone += actual;
          if (this.onVisual && actual > 0) this.onVisual('unitHeal', { unitIndex: u.index, amount: actual });
        }
      });
      parts.push(`High morale! All allies heal ${healAmt} HP.`);
    }
    if (result.buffAllies) {
      const attacks = result.buffAllies.attacks || 1;
      // Buff damage scales with half of caster's equipment damage
      const scaledBonusDmg = (result.buffAllies.bonusDamage || 0) + Math.floor((unit.equipDamage || 0) / 2);
      this.party.forEach(u => {
        if (!u.downed) {
          let buffAttacks = attacks;
          // Sigil of the Ninth: buff effects last 1 extra attack
          if (this.unitHasItem(u, 'sigil_of_the_ninth')) buffAttacks += 1;
          u.buffs.push({ damage: scaledBonusDmg, attacksLeft: buffAttacks });
        }
      });
      const attackStr = attacks === 1 ? 'next attack' : `next ${attacks} attacks`;
      if (!result.damage && !result.heal && !result.block && !result.blockAll) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 allies gain +${scaledBonusDmg} damage (${attackStr}).`);
      }
    }
    // Buff Self: buff only the caster
    if (result.buffSelf) {
      const selfAttacks = result.buffSelf.attacks || 1;
      const selfBonusDmg = (result.buffSelf.bonusDamage || 0) + Math.floor((unit.equipDamage || 0) / 2);
      let buffAttacks = selfAttacks;
      if (this.unitHasItem(unit, 'sigil_of_the_ninth')) buffAttacks += 1;
      unit.buffs.push({ damage: selfBonusDmg, attacksLeft: buffAttacks });
      const attackStr = selfAttacks === 1 ? 'next attack' : `next ${selfAttacks} attacks`;
      parts.push(`${unit.name} gains +${selfBonusDmg} damage (${attackStr}).`);
    }
    // Poison (single target)
    if (result.poison && result.target) {
      let totalPoison = result.poison + (unit.equipPoison || 0);
      // Double Poison: doubles applied poison if target is already poisoned
      const doubled = result.doublePoison && (result.target.poison || 0) > 0;
      if (doubled) totalPoison *= 2;
      result.target.poison = (result.target.poison || 0) + totalPoison;
      unit.stats.poisonInflicted += totalPoison;
      const bonusStr = unit.equipPoison > 0 ? ` (${result.poison}+${unit.equipPoison})` : '';
      const doubledStr = doubled ? ' Doubled!' : '';
      parts.push(`Applies ${totalPoison}${bonusStr} Poison.${doubledStr}`);
    }
    // Mark Target: enemy takes +20% damage for 1 turn
    if (result.markTarget && result.target) {
      result.target._marked = 2; // ticks down each enemy turn; active while > 0
      parts.push(`${result.target.name} is marked! (+20% damage next turn)`);
    }
    // Poison splash: apply to all other enemies
    if (result.poisonSplash && result.target) {
      const splashPoison = result.poisonSplash;
      this.enemies.forEach(e => {
        if (!e.dead && e !== result.target) {
          e.poison = (e.poison || 0) + splashPoison;
          unit.stats.poisonInflicted += splashPoison;
        }
      });
      parts.push(`${splashPoison} Poison splashes to other enemies.`);
    }
    // Poison all enemies
    if (result.poisonAll) {
      const totalPoison = result.poisonAll + (unit.equipPoison || 0);
      this.enemies.forEach(e => {
        if (!e.dead) {
          e.poison = (e.poison || 0) + totalPoison;
          unit.stats.poisonInflicted += totalPoison;
        }
      });
      parts.push(`${unit.name} uses ${skill.name} \u2014 applies ${totalPoison} Poison to all enemies.`);
    }
    // Damage all enemies (AoE)
    if (result.damageAll) {
      const aoeBonus = result.halfBonusDmg ? Math.floor(bonusDmg / 2) : bonusDmg;
      const aoeDmg = result.damageAll + aoeBonus;
      this.enemies.forEach(e => {
        if (!e.dead) {
          let dmg = aoeDmg;
          const auraRed = this.getAuraDamageReduction(e);
          if (auraRed > 0) dmg = Math.max(1, dmg - auraRed);
          if (e.block && e.block > 0) {
            const absorbed = Math.min(e.block, dmg);
            e.block -= absorbed;
            dmg -= absorbed;
          }
          e.hp = Math.max(0, e.hp - dmg);
          unit.stats.damageDealt += dmg;
          // Ballistarius pinning on AoE
          if (unit.classId === 'ballistarius' && dmg > 0 && e.hp > 0) e._pinned = true;
        }
      });
      parts.push(`${unit.name} uses ${skill.name} \u2014 deals ${aoeDmg} damage to all enemies.`);
    }
    // Heal all allies
    if (result.healAll) {
      const baseHealAll = result.healAll + bonusHeal;
      this.party.forEach(u => {
        if (!u.downed) {
          let totalHeal = baseHealAll;
          // Resonance: double the heal for this unit
          if (u._resonance) {
            totalHeal *= 2;
            u._resonance = false;
            parts.push(`Resonance doubles healing on ${u.name}!`);
          }
          // Healer's Oath: healing below 25% HP heals double
          if (this.unitHasItem(unit, 'healers_oath') && u.hp <= u.maxHp * 0.25) {
            totalHeal *= 2;
            parts.push(`Healer's Oath doubles the heal on ${u.name}!`);
          }
          const before = u.hp;
          u.hp = Math.min(u.maxHp, u.hp + totalHeal);
          const actual = u.hp - before;
          unit.stats.healingDone += actual;
          // Crown of Thorns: when healed, deal damage to all enemies (scales with level)
          if (this.unitHasItem(u, 'crown_of_thorns') && actual > 0) {
            const cotLv = this.getItemLevel(u, 'crown_of_thorns');
            const cotDmg = 2 * cotLv;
            this.enemies.forEach(e => { if (!e.dead) e.hp = Math.max(0, e.hp - cotDmg); });
            parts.push(`Crown of Thorns — ${cotDmg} damage to all enemies!`);
          }
          // Bitter Remedy: when this unit is healed, poison a random enemy (scales with level)
          if (this.unitHasItem(u, 'bitter_remedy') && actual > 0) {
            const brLv = this.getItemLevel(u, 'bitter_remedy');
            const brPoison = 1 * brLv;
            const aliveEnemies = this.enemies.filter(e => !e.dead);
            if (aliveEnemies.length > 0) {
              const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              victim.poison = (victim.poison || 0) + brPoison;
              parts.push(`Bitter Remedy poisons ${victim.name}. (+${brPoison} Poison)`);
            }
          }
        }
      });
      // Herbalist's Satchel: healing applies poison to random enemy (scales with level)
      if (this.unitHasItem(unit, 'herbalists_satchel')) {
        const hsLv = this.getItemLevel(unit, 'herbalists_satchel');
        const hsPoison = 1 * hsLv;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length > 0) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + hsPoison;
          parts.push(`Herbalist's Satchel poisons ${victim.name}. (+${hsPoison} Poison)`);
        }
      }
      // Marsh Root Brew: healing grants block to all healed allies (scales with level)
      if (this.unitHasItem(unit, 'marsh_root_brew')) {
        const mrbLv = this.getItemLevel(unit, 'marsh_root_brew');
        const mrbBlock = 1 * mrbLv;
        this.party.forEach(u => {
          if (!u.downed) {
            u.block = (u.block || 0) + mrbBlock;
          }
        });
        parts.push(`Marsh Root Brew grants ${mrbBlock} Block to all allies.`);
      }
      const bonusStr = bonusHeal > 0 ? ` (${result.healAll}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals all allies for ${baseHealAll}${bonusStr} HP.`);
    }
    // Cleanse poison from target
    if (result.cleanse && result.target && result.target.poison > 0) {
      result.target.poison = 0;
      parts.push('Poison cleared.');
    }
    if (result.morale) {
      const oldMorale = this.morale;
      this.morale = Math.max(-100, Math.min(100, this.morale + result.morale));
      if (result.morale > 0) unit.stats.moraleRestored += this.morale - oldMorale;
      parts.push(`+${result.morale} Morale.`);
      if (this.onVisual) this.onVisual('morale', { amount: result.morale });
    }

    // Counter Stance: set flag on unit, checked during enemy damage
    if (result.counterStance) {
      unit._counterStance = result.counterStance;
      parts.push(`${unit.name} enters counter stance! (${result.counterStance} retaliatory damage)`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Counter', color: 'var(--gold)' });
    }

    // Shieldbreak: remove all block from target
    if (result.shieldbreak && result.target) {
      const removedBlock = result.target.block || 0;
      result.target.block = 0;
      if (removedBlock > 0) parts.push(`${result.target.name}'s block shattered! (-${removedBlock} Block)`);
    }

    // Overwatch: set flag on unit, checked during enemy damage
    if (result.overwatch) {
      unit._overwatch = result.overwatch;
      parts.push(`${unit.name} sets an overwatch! (${result.overwatch} damage to next attacker)`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Overwatch', color: 'var(--gold)' });
    }

    // Suppress: target deals 40% less damage for N turns
    if (result.suppress && result.target) {
      result.target._suppressed = result.suppress;
      parts.push(`${result.target.name} is suppressed! (-40% damage for ${result.suppress} turns)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Suppressed', color: '#aa66aa' });
    }

    // Stimulant: target ally can act again
    if (result.stimulant && result.target) {
      result.target.actedThisTurn = false;
      parts.push(`${result.target.name} is reinvigorated! Can act again this turn.`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Stimulant!', color: 'var(--green-bright)' });
    }

    // Transfusion: transfer HP from self to target (ally receives double heal bonus)
    if (result.transfusion && result.target) {
      const selfCost = result.transfusion + bonusHeal;
      const allyHeal = result.transfusion + bonusHeal * 2;
      const maxCost = Math.min(selfCost, unit.hp - 1);
      const maxHeal = Math.min(allyHeal, result.target.maxHp - result.target.hp);
      if (maxCost > 0 && maxHeal > 0) {
        unit.hp -= maxCost;
        result.target.hp += maxHeal;
        unit.stats.healingDone += maxHeal;
        parts.push(`${unit.name} sacrifices ${maxCost} HP \u2014 ${result.target.name} heals ${maxHeal} HP.`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: result.target.index, amount: maxHeal });
      } else {
        parts.push('No HP to transfer.');
      }
    }

    // Cripple: target deals 30% less damage for N actions
    if (result.cripple && result.target) {
      result.target._crippled = result.cripple;
      parts.push(`${result.target.name} is crippled! (-30% damage for ${result.cripple} actions)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Crippled', color: '#aa66aa' });
    }

    // Snare Trap: if target attacks this turn, takes damage and is stunned
    if (result.snareTrap && result.target) {
      result.target._snareTrap = result.snareTrap;
      parts.push(`A trap is set on ${result.target.name}!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Trapped', color: 'var(--gold)' });
    }

    // Caltrops: mark + snare trap on target and adjacent front-row enemies
    if (result.caltrops && result.target) {
      const caltropTargets = [result.target];
      // Find adjacent front-row enemies
      const sameRow = this.enemies.filter(e => !e.dead && e.row === 'front' && e !== result.target);
      sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
      const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
      caltropTargets.push(...adjacent);
      caltropTargets.forEach(e => {
        e._marked = 2;
        e._snareTrap = result.caltrops;
      });
      const names = caltropTargets.map(e => e.name).join(', ');
      parts.push(`Caltrops! ${names} marked and trapped!`);
      caltropTargets.forEach(e => {
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: e.index, text: 'Caltrops!', color: 'var(--gold)' });
      });
    }

    // Stun: skip target's next action
    if (result.stun && result.target) {
      result.target._skipNextAction = true;
      parts.push(`${result.target.name} is stunned!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Stunned!', color: '#aa66aa' });
    }

    // Revive: bring a downed ally back
    if (result.revive && result.target && result.target.downed) {
      result.target.downed = false;
      const reviveHp = Math.max(1, Math.floor(result.target.maxHp * 0.25));
      result.target.hp = reviveHp;
      result.target.block = (result.target.block || 0) + reviveHp;
      parts.push(`${result.target.name} is revived at ${reviveHp} HP with ${reviveHp} Block!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Revived!', color: 'var(--green-bright)' });
      if (this.onVisual) this.onVisual('unitHeal', { unitIndex: result.target.index, amount: reviveHp });
    }

    // Morale Cost: spend morale to use the skill
    if (result.moraleCost) {
      this.morale = Math.max(-100, this.morale - result.moraleCost);
      parts.push(`(-${result.moraleCost} Morale)`);
      if (this.onVisual) this.onVisual('morale', { amount: -result.moraleCost });
    }

    // Deafen: target's morale attacks have no effect for N turns
    if (result.deafen && result.target) {
      result.target._deafened = result.deafen;
      parts.push(`${result.target.name} is deafened! Morale attacks nullified for ${result.deafen} turns.`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Deafened', color: '#aa66aa' });
    }

    // Resonance: mark ally, next heal doubled + grant block
    if (result.resonance && result.target) {
      result.target._resonance = true;
      parts.push(`${result.target.name} resonates with healing energy! Next heal doubled.`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Resonance', color: 'var(--green-bright)' });
    }

    // Pull to Front: move enemy to front row
    if (result.pullToFront && result.target && result.target.row === 'back') {
      result.target.row = 'front';
      parts.push(`${result.target.name} is pulled to the front row!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Pulled!', color: 'var(--red-bright)' });
    }

    // Damage Shield: all allies take X% less damage next enemy turn
    if (result.damageShield) {
      this.party.forEach(u => { if (!u.downed) u._damageShield = result.damageShield; });
      const pct = Math.round((1 - result.damageShield) * 100);
      parts.push(`All allies take ${pct}% less damage next enemy turn.`);
    }

    // Smoke Screen: all enemies have X% chance to miss
    if (result.smokeScreen) {
      this.enemies.forEach(e => { if (!e.dead) e._smokeScreen = result.smokeScreen; });
      const pct = Math.round(result.smokeScreen * 100);
      parts.push(`Smoke covers the field! Enemies have ${pct}% chance to miss.`);
    }

    // Intercept: next attack on any ally hits this unit instead at half damage, reflects half, stuns attacker
    if (result.intercept) {
      unit._intercept = true;
      parts.push(`${unit.name} stands ready to intercept the next attack!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Intercept', color: 'var(--blue-bright)' });
    }

    // Avenger's Oath: bonus damage if ally is downed
    if (result.avengeDamage && result.target) {
      const anyDowned = this.party.some(u => u.downed);
      if (anyDowned) {
        const extraDmg = result.avengeDamage - (result.damage || 0);
        if (extraDmg > 0) {
          result.target.hp = Math.max(0, result.target.hp - extraDmg);
          unit.stats.damageDealt += extraDmg;
          parts.push(`AVENGER'S OATH! (+${extraDmg} bonus damage, ignores block)`);
        }
      }
    }

    // Shoulder Charge: knockback to back row, or bonus damage if already back
    if (result.shoulderCharge && result.target) {
      if (result.target.row === 'front') {
        result.target.row = 'back';
        parts.push(`${result.target.name} is knocked to the back row!`);
      } else {
        // Already back row — deal 2 extra damage
        const bonusDmg = 2;
        result.target.hp = Math.max(0, result.target.hp - bonusDmg);
        unit.stats.damageDealt += bonusDmg;
        parts.push(`${result.target.name} has nowhere to go! (+${bonusDmg} bonus damage)`);
      }
    }

    // Echo on Kill: if target dies, chain damage to random other enemy
    if (result.echoOnKill && result.target && result.target.hp <= 0) {
      const others = this.enemies.filter(e => !e.dead && e !== result.target && e.hp > 0);
      if (others.length > 0) {
        const echoTarget = others[Math.floor(Math.random() * others.length)];
        echoTarget.hp = Math.max(0, echoTarget.hp - result.echoOnKill);
        unit.stats.damageDealt += result.echoOnKill;
        parts.push(`The blast echoes — ${echoTarget.name} takes ${result.echoOnKill} damage!`);
      }
    }

    // Warhorse Kick: stun target + random other front-row enemy
    if (result.warhorseKick && result.target) {
      result.target._skipNextAction = true;
      parts.push(`${result.target.name} is stunned!`);
      const otherFront = this.enemies.filter(e => !e.dead && e.row === 'front' && e !== result.target);
      if (otherFront.length > 0) {
        const secondTarget = otherFront[Math.floor(Math.random() * otherFront.length)];
        secondTarget._skipNextAction = true;
        parts.push(`${secondTarget.name} is also stunned!`);
      }
    }

    // Shieldbreak All: remove all block from all enemies
    if (result.shieldbreakAll) {
      let totalRemoved = 0;
      this.enemies.forEach(e => {
        if (!e.dead && e.block > 0) {
          totalRemoved += e.block;
          e.block = 0;
        }
      });
      if (totalRemoved > 0) parts.push(`All enemy block shattered! (-${totalRemoved} Block total)`);
    }

    // Condemn: target takes +30% damage from all sources for N turns
    if (result.condemn && result.target) {
      result.target._condemned = result.condemn;
      parts.push(`${result.target.name} is condemned! (+30% damage from all sources for ${result.condemn} turns)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Condemned', color: 'var(--red-bright)' });
    }

    if (parts.length === 0) parts.push(`${unit.name} uses ${skill.name}.`);
    return parts.join(' ');
  }

  triggerVictory() {
    this.phase = PHASE.VICTORY;
    this.morale = Math.min(100, this.morale + 7);
    this.addLog('All enemies defeated! (+7 Morale)');
    if (this.onVisual) this.onVisual('morale', { amount: 7 });

    // Boss encounter bonus: if a boss was killed but minions survived after it,
    // grant an additional morale boost at victory
    const killedBoss = this.enemies.find(e => e.isBoss && e.dead);
    if (killedBoss) {
      // Check if any non-boss enemies are also dead (meaning they died after/alongside the boss)
      const nonBossKills = this.enemies.filter(e => !e.isBoss && e.dead && !e.isStructure);
      if (nonBossKills.length > 0) {
        const bossBonus = 15;
        this.morale = Math.min(100, this.morale + bossBonus);
        this.addLog(`The champion is slain! Your men roar in triumph! (+${bossBonus} Morale)`);
        if (this.onVisual) this.onVisual('morale', { amount: bossBonus });
      }
    }

    this.update();
  }

  checkEnemyDeaths() {
    // Loop until no new deaths — death effects can chain-kill other enemies
    let hadDeath = true;
    while (hadDeath) {
      hadDeath = false;
      for (const e of this.enemies) {
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          e.hp = 0;
          hadDeath = true;
          this.killedEnemies.push(e.id);
          this.totalEnemiesKilled++;
          this.addLog(`${e.name} falls!`);

          // Morale restored on kill — based on enemy base maxHp, doubled for seers
          const baseHp = ENEMY_DATA[e.id] ? ENEMY_DATA[e.id].maxHp : e.maxHp;
          let moraleRestore;
          if (e.isBoss) {
            // Boss: restore to 50, or +25 if already 26+
            if (this.morale >= 26) {
              moraleRestore = 25;
            } else {
              moraleRestore = 50 - this.morale;
            }
          } else {
            moraleRestore = baseHp > 10 ? 6 : 4;
          }
          if (e.deathMoraleMultiplier) moraleRestore *= e.deathMoraleMultiplier;
          if (this.partyHasItem('chiefs_spear')) moraleRestore += 3;
          this.morale = Math.min(100, this.morale + moraleRestore);
          this.addLog(`Your men rally! (+${moraleRestore} Morale)`);
          if (this.onVisual) this.onVisual('morale', { amount: moraleRestore });

          // Fang Necklace: killing an enemy grants damage buff for 2 attacks (scales with level)
          this.party.forEach(u => {
            if (!u.downed && this.unitHasItem(u, 'fang_necklace')) {
              const fnLv = this.getItemLevel(u, 'fang_necklace');
              const fnDmg = 1 * fnLv;
              u.buffs.push({ damage: fnDmg, attacksLeft: 2 });
              this.addLog(`${u.name}'s Fang Necklace pulses — +${fnDmg} damage (2 attacks).`);
            }
          });

          // Vanguard's Banner: kills grant all allies block (scales with level)
          if (this.partyHasItem('vanguards_banner')) {
            const vbLv = this.getPartyItemLevel('vanguards_banner');
            const vbBlock = 2 + (vbLv - 1);
            this.party.forEach(u => {
              if (!u.downed) {
                u.block = (u.block || 0) + vbBlock;
              }
            });
            this.addLog(`Vanguard's Banner — all allies gain ${vbBlock} Block.`);
          }

          if (e.deathPoison) {
            this.party.forEach(u => {
              if (!u.downed) u.poison = (u.poison || 0) + e.deathPoison;
            });
            this.addLog(`${e.name} bursts — toxic innards spray the party! (+${e.deathPoison} Poison to all)`);
          }

          if (e.deathDamageEnemy) {
            const aliveEnemies = this.enemies.filter(oe => !oe.dead && oe !== e);
            if (aliveEnemies.length > 0) {
              const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              victim.hp = Math.max(0, victim.hp - e.deathDamageEnemy);
              this.addLog(`${e.name} collapses onto ${victim.name} for ${e.deathDamageEnemy} damage!`);
            }
          }

          // --- Boss-specific death reactions ---

          // Arminius's Champion: revenge — deal 5 damage to whoever killed his ally
          const champion = this.enemies.find(b => b.id === 'arminius_champion' && !b.dead && b !== e);
          if (champion && !e.isBoss) {
            champion.row = 'front';
            // Damage a random alive party member
            const aliveParty = this.party.filter(u => !u.downed);
            if (aliveParty.length > 0) {
              const victim = aliveParty[Math.floor(Math.random() * aliveParty.length)];
              victim.hp = Math.max(1, victim.hp - 5);
              victim.stats.damageTaken += 5;
              this.addLog(`${champion.name} charges forward in rage and strikes ${victim.name} for 5 damage!`);
              if (this.onVisual) this.onVisual('unitHit', { unitIndex: victim.index, damage: 5 });
            }
          }

          // Mire Mother: gains +2 damage per action when a boar dies
          const mireMother = this.enemies.find(b => b.id === 'mire_mother' && !b.dead);
          if (mireMother && (e.id === 'boar_youngling' || e.id === 'war_boar')) {
            mireMother.actions.forEach(a => { if (a.damage > 0) a.damage += 2; });
            this.addLog(`${mireMother.name} howls with rage! Her attacks grow stronger!`);
          }

          // Bone Speaker: raise dead allies as bone totems
          const boneSpeaker = this.enemies.find(b => b.id === 'bone_speaker' && !b.dead);
          if (boneSpeaker && !e.isBoss && !e.isStructure && e.id !== 'bone_totem' && e.id !== 'healing_totem' && !e._raisedAsTotem) {
            e._raisedAsTotem = true;
            if (this.enemies.filter(en => !en.dead).length < 6) {
              const totem = {
                index: this.enemies.length,
                id: 'bone_totem',
                name: `${e.name}'s Bones`,
                maxHp: 15,
                hp: 15,
                row: 'front',
                damage: [0, 0],
                speed: 0,
                xpValue: 2,
                ai: 'passive',
                isStructure: true,
                stunOnDeath: true,
                dead: false,
                poison: 0,
                block: 25,
                justSpawned: true,
                actions: [{ name: 'Rattle', damage: 0, morale: -6, chance: 1.0, text: 'rattles with dark energy' }],
              };
              this.enemies.push(totem);
              this.addLog(`${boneSpeaker.name} raises ${e.name}'s bones as a totem!`);
              setTimeout(() => { totem.justSpawned = false; this.update(); }, 500);
            }
          }

          // Bone Totem: destroying it stuns the killer (skip next turn)
          if (e.stunOnDeath) {
            // Find last unit that acted — that's likely the killer
            const lastActor = this.party.find(u => u.actedThisTurn && !u.downed);
            if (lastActor) {
              lastActor._stunNextTurn = true;
              this.addLog(`The bones shatter — ${lastActor.name} is stunned next turn!`);
            }
          }
        }
      }
    }
  }

  shouldAutoEndTurn() {
    // No dice left
    if (this.dicePool.getAvailable().length === 0) return true;
    // All units acted, downed, or can't use any skill
    return this.party.every(u => {
      if (u.downed || u.actedThisTurn) return true;
      // Check if this unit can use at least one skill
      const available = this.dicePool.getAvailable();
      return !u.skills.some(s => this.canUseSkill(u.index, s, available));
    });
  }

  // --- End player turn ---
  endPlayerTurn() {
    if (this.phase !== PHASE.PLAYER_TURN) return;
    this.phase = PHASE.ENEMY_TURN;
    this.update();
    setTimeout(() => this.executeEnemyTurn(), 600);
  }

  // --- Enemy turn (sequential) ---
  executeEnemyTurn() {
    // Clear enemy block, tick cooldowns, track turns alive, handle phase shifts
    this.enemies.forEach(e => {
      if (!e.dead) e.block = 0;
      if (e._actionCooldowns) {
        for (const name in e._actionCooldowns) {
          if (e._actionCooldowns[name] > 0) e._actionCooldowns[name]--;
        }
      }
      // Tick down marks and condemn
      if (e._marked && e._marked > 0) e._marked--;
      if (e._condemned && e._condemned > 0) e._condemned--;
      // Track turns alive for phase shift enemies
      if (!e.dead) {
        e._turnsAlive = (e._turnsAlive || 0) + 1;
        // Phase shift: move to new row after N turns
        if (e.phaseShift && e._turnsAlive > e.phaseShift.afterTurns && e.row !== e.phaseShift.toRow) {
          e.row = e.phaseShift.toRow;
          this.addLog(`${e.name} charges to the ${e.phaseShift.toRow} row!`);
        }
      }
    });
    const alive = this.enemies.filter(e => !e.dead);
    if (alive.length === 0) return;
    this.executeEnemySequence(alive, 0);
  }

  executeEnemySequence(enemies, index) {
    if (index >= enemies.length || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
      this.checkPartyDowned();
      if (this.phase !== PHASE.DEFEAT && this.phase !== PHASE.VICTORY) {
        this.rollEnemyIntents();
        setTimeout(() => this.startRollPhase(), 400);
      } else {
        this.update();
      }
      return;
    }

    const enemy = enemies[index];
    if (enemy.dead) {
      // Skip dead enemies (could have died to another enemy's death effect)
      setTimeout(() => this.executeEnemySequence(enemies, index + 1), 100);
      return;
    }
    this.executeEnemyAction(enemy);

    // Check for second strike (boss enrage or wounded frenzy)
    const needsSecondStrike =
      (enemy.isBoss && enemy.hp > 0 && !enemy.dead && enemy.hp <= enemy.maxHp * 0.5) ||
      (!enemy.isBoss && enemy.woundedDoubleAttack && enemy.hp > 0 && !enemy.dead && enemy.hp <= enemy.maxHp * 0.5);

    if (needsSecondStrike) {
      this.update();
      setTimeout(() => {
        if (enemy.dead || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
          this.executeEnemySequence(enemies, index + 1);
          return;
        }
        const msg = enemy.isBoss ? `${enemy.name} is enraged and strikes again!` : `${enemy.name} is wounded and attacks in a frenzy!`;
        this.addLog(msg);
        this.executeEnemySingleAction(enemy);
        this.checkPartyDowned();
        this.update();
        setTimeout(() => this.executeEnemySequence(enemies, index + 1), 800);
      }, 600);
    } else {
      this.checkPartyDowned();
      this.update();
      setTimeout(() => this.executeEnemySequence(enemies, index + 1), 800);
    }
  }

  executeEnemyAction(enemy) {
    this.executeEnemySingleAction(enemy);
  }

  executeEnemySingleAction(enemy) {
    // Stunned enemy: skip action
    if (enemy._skipNextAction) {
      enemy._skipNextAction = false;
      this.addLog(`${enemy.name} is stunned and cannot act!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Stunned!', color: 'var(--red-bright)' });
      return;
    }

    // Structures (Wicker Man) don't take actions — their damage is passive via turnDamageAll
    if (enemy.isStructure) {
      this.addLog(`${enemy.name} ${enemy.actions[0].text}.`);
      return;
    }

    // Tick down enemy action cooldowns
    if (!enemy._actionCooldowns) enemy._actionCooldowns = {};

    // Defensive AI: only attack if last alive in row, otherwise only use non-damage actions
    let availableActions = enemy.actions;
    if (enemy.ai === 'defensive') {
      const sameRowAlive = this.enemies.filter(e => !e.dead && e.row === enemy.row && e !== enemy);
      if (sameRowAlive.length > 0) {
        const nonDamage = availableActions.filter(a => !a.damage || a.damage === 0);
        if (nonDamage.length > 0) availableActions = nonDamage;
      }
    }

    // Phase-based filtering: only use actions matching current phase (ranged = back row, melee = front row)
    if (enemy.phaseShift) {
      const currentPhase = enemy.row === 'back' ? 'ranged' : 'melee';
      const phaseFiltered = availableActions.filter(a => !a.phase || a.phase === currentPhase);
      if (phaseFiltered.length > 0) availableActions = phaseFiltered;
    }

    // Filter out actions on cooldown
    const offCooldown = availableActions.filter(a => !a.cooldown || !(enemy._actionCooldowns[a.name] > 0));
    if (offCooldown.length > 0) availableActions = offCooldown;

    // Normalize chances for filtered actions
    const totalChance = availableActions.reduce((s, a) => s + a.chance, 0);
    const roll = Math.random() * totalChance;
    let cumulative = 0;
    let action = availableActions[0];
    for (const a of availableActions) {
      cumulative += a.chance;
      if (roll <= cumulative) { action = a; break; }
    }

    // Set cooldown on used action
    if (action.cooldown) {
      enemy._actionCooldowns[action.name] = action.cooldown + 1;
    }

    const target = this.pickEnemyTarget(enemy, action);
    if (!target) return;

    // Smoke Screen: chance to miss entirely
    if (enemy._smokeScreen && Math.random() < enemy._smokeScreen) {
      enemy._smokeScreen = 0;
      this.addLog(`${enemy.name}'s attack misses in the smoke!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Miss!', color: 'var(--text-dim)' });
      return;
    }

    if (this.onVisual) {
      this.onVisual('enemyAttack', { enemyIndex: enemy.index });
    }

    if (action.damage > 0 || action.damageFromBlock) {
      // Ironbound Champion: damage = base + current block (consumes block)
      let actionDamage = action.damage || 0;
      if (action.damageFromBlock && enemy.block > 0) {
        actionDamage += enemy.block;
        this.addLog(`${enemy.name} channels ${enemy.block} block into the charge!`);
        enemy.block = 0;
      }
      // Berserk Rage: bonus damage based on missing HP (up to +50% at 0 HP)
      if (enemy.berserkRage && enemy.maxHp > 0) {
        const missingPct = 1 - (enemy.hp / enemy.maxHp);
        const rageBonus = Math.round(actionDamage * missingPct * 0.5);
        if (rageBonus > 0) {
          actionDamage += rageBonus;
          this.addLog(`${enemy.name}'s rage intensifies! (+${rageBonus} damage)`);
        }
      }
      // Curse: Hunter's Shadow — enemies deal +1 damage
      const curseBonusDmg = this.getActiveCurses().includes('hunters_shadow') ? 1 : 0;
      let dmg = actionDamage + curseBonusDmg;
      // Ballistarius passive: Pinning Fire — pinned enemies deal 15% less
      if (enemy._pinned) {
        const reduction = Math.max(1, Math.floor(dmg * 0.15));
        dmg = Math.max(1, dmg - reduction);
        enemy._pinned = false;
      }
      // Suppress: -40% damage
      if (enemy._suppressed && enemy._suppressed > 0) {
        const suppReduction = Math.max(1, Math.floor(dmg * 0.4));
        dmg = Math.max(1, dmg - suppReduction);
        enemy._suppressed--;
      }
      // Cripple: -30% damage for N actions
      if (enemy._crippled && enemy._crippled > 0) {
        const cripReduction = Math.max(1, Math.floor(dmg * 0.3));
        dmg = Math.max(1, dmg - cripReduction);
        enemy._crippled--;
      }
      // Intercept: Praetorian takes the hit instead
      const interceptor = this.party.find(u => !u.downed && u._intercept && u !== target);
      if (interceptor && dmg > 0) {
        interceptor._intercept = false;
        const halfDmg = Math.max(1, Math.floor(dmg / 2));
        interceptor.hp = Math.max(0, interceptor.hp - halfDmg);
        interceptor.stats.damageTaken += halfDmg;
        enemy.hp = Math.max(0, enemy.hp - halfDmg);
        enemy._skipNextAction = true;
        this.addLog(`${interceptor.name} intercepts! Takes ${halfDmg} damage, reflects ${halfDmg} back. ${enemy.name} is stunned!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: interceptor.index, text: 'Intercept!', color: 'var(--blue-bright)' });
        if (this.onVisual) {
          this.onVisual('unitHit', { unitIndex: interceptor.index, damage: halfDmg });
        }
        dmg = 0;
      }
      // Damage Shield: reduce incoming damage
      if (target._damageShield && dmg > 0) {
        dmg = Math.max(1, Math.round(dmg * target._damageShield));
        target._damageShield = 0;
      }
      if (target.block > 0) {
        const absorbed = Math.min(target.block, dmg);
        // Legionary's Lorica: deal difficulty damage back when hit while having block
        if (absorbed > 0 && this.unitHasItem(target, 'legionary_lorica')) {
          const loricaDmg = this.difficulty || 1;
          enemy.hp = Math.max(0, enemy.hp - loricaDmg);
          this.addLog(`Lorica retaliates for ${loricaDmg} damage!`);
        }
        target.block -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) {
          this.addLog(`${target.name}'s block absorbs ${absorbed} damage.`);
        }
      }
      // Berserker Mushroom: gain +1 damage each time hit (max +4)
      if (dmg > 0 && this.unitHasItem(target, 'berserker_mushroom')) {
        if (!target._mushroomRage) target._mushroomRage = 0;
        if (target._mushroomRage < 5) {
          target._mushroomRage++;
          target.equipDamage++;
          this.addLog(`${target.name}'s rage grows! (+1 damage, ${target._mushroomRage}/5)`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: `Rage ${target._mushroomRage}!`, color: 'var(--red-bright)' });
        }
      }
      // Wolf Pelt: first hit each combat deals less damage (scales with level)
      if (dmg > 0 && !target._wolfPeltUsed && this.unitHasItem(target, 'wolf_pelt')) {
        target._wolfPeltUsed = true;
        const wpLv = this.getItemLevel(target, 'wolf_pelt');
        const wpReduction = 3 + (wpLv - 1);
        dmg = Math.max(1, dmg - wpReduction);
        this.addLog(`Wolf Pelt absorbs the first blow! (-${wpReduction} damage)`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Pelt!', color: 'var(--gold)' });
      }
      // Centurion's Gorget: reduce incoming damage by 3 (minimum 1)
      if (dmg > 0 && this.unitHasItem(target, 'centurions_gorget')) {
        dmg = Math.max(1, dmg - 3);
      }
      // Damage Shield: reduce incoming damage
      if (target._damageShield && dmg > 0) {
        dmg = Math.max(1, Math.round(dmg * target._damageShield));
        target._damageShield = 0;
      }
      // Heartwood Charm: first time taking damage this combat, gain +3 dice next turn
      if (dmg > 0 && !this._heartwoodTriggered && this.partyHasItem('heartwood_charm')) {
        this._heartwoodTriggered = true;
        this._heartwoodBonusDice = 3;
        this.addLog('Heartwood Charm pulses — bonus dice next turn!');
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: '+3 Dice!', color: 'var(--green-bright)' });
      }
      target.hp = Math.max(0, target.hp - dmg);
      target.stats.damageTaken += dmg;
      if (dmg > 0) target._wasHitThisTurn = true;
      const totalActionDmg = actionDamage + curseBonusDmg;
      this.addLog(`${enemy.name} ${action.text} at ${target.name} for ${totalActionDmg} damage${dmg < totalActionDmg ? ` (${dmg} after block)` : ''}.`);

      if (this.onVisual) {
        this.onVisual('unitHit', { unitIndex: target.index, damage: dmg });
      }

      // Counter Stance: retaliate damage
      if (target._counterStance && dmg > 0) {
        const counterDmg = dmg + 2;
        enemy.hp = Math.max(0, enemy.hp - counterDmg);
        target._counterStance = 0;
        this.addLog(`${target.name} retaliates for ${counterDmg} damage! (${dmg}+2)`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Counter!', color: 'var(--red-bright)' });
      }

      // Overwatch: check all allies for overwatch
      this.party.forEach(u => {
        if (!u.downed && u._overwatch && u._overwatch > 0) {
          const owDmg = u._overwatch;
          enemy.hp = Math.max(0, enemy.hp - owDmg);
          u._overwatch = 0;
          this.addLog(`${u.name}'s overwatch fires! ${enemy.name} takes ${owDmg} damage.`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Overwatch!', color: 'var(--gold)' });
        }
      });

      // Thorn Mantle: when hit, deal damage back to attacker (scales with level)
      if (dmg > 0 && this.unitHasItem(target, 'thorn_mantle')) {
        const tmLv = this.getItemLevel(target, 'thorn_mantle');
        const thornDmg = 2 * tmLv;
        enemy.hp = Math.max(0, enemy.hp - thornDmg);
        this.addLog(`Thorn Mantle deals ${thornDmg} damage back!`);
      }

      // Snare Trap: if this enemy has a trap and attacked, trigger it
      if (enemy._snareTrap && dmg > 0) {
        const trapDmg = enemy._snareTrap;
        enemy.hp = Math.max(0, enemy.hp - trapDmg);
        enemy._skipNextAction = true;
        enemy._snareTrap = 0;
        this.addLog(`The trap springs! ${enemy.name} takes ${trapDmg} damage and is stunned!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Trapped!', color: 'var(--gold)' });
      }
    }

    // Enemy poison on target
    if (action.poisonTarget && target) {
      target.poison = (target.poison || 0) + action.poisonTarget;
      this.addLog(`${target.name} is poisoned! (+${action.poisonTarget} Poison)`);
    }

    if (action.morale) {
      let moraleDelta = action.morale;
      // Deafened: morale attacks have no effect
      if (enemy._deafened && enemy._deafened > 0 && moraleDelta < 0) {
        enemy._deafened--;
        this.addLog(`${enemy.name} is deafened — morale attack has no effect!`);
        moraleDelta = 0;
      }
      // Cornicen passive: Demoralizing Horn — enemy morale attacks deal 3 less morale damage
      if (moraleDelta < 0 && this.party.some(u => !u.downed && u.classId === 'cornicen')) {
        moraleDelta = Math.min(0, moraleDelta + 3);
      }
      if (moraleDelta !== 0) {
        this.morale = Math.max(-100, Math.min(100, this.morale + moraleDelta));
        this.addLog(`${enemy.name} ${action.text}! Morale ${moraleDelta > 0 ? '+' : ''}${moraleDelta}.`);
        if (this.onVisual) {
          this.onVisual('morale', { amount: moraleDelta });
        }
      }
    }

    if (action.aoe && action.damage > 0) {
      this.party.forEach(u => {
        if (!u.downed && u !== target) {
          let aoeDmg = action.damage;
          if (u.block > 0) {
            const absorbed = Math.min(u.block, aoeDmg);
            u.block -= absorbed;
            aoeDmg -= absorbed;
          }
          u.hp = Math.max(0, u.hp - aoeDmg);
          u.stats.damageTaken += aoeDmg;
          if (this.onVisual) {
            this.onVisual('unitHit', { unitIndex: u.index, damage: aoeDmg });
          }
        }
      });
      this.addLog(`${enemy.name}'s attack hits the whole line!`);
    }

    // Boar Charge: move to front row and stun the target
    if (action.boarCharge && target) {
      if (enemy.row === 'back') {
        enemy.row = 'front';
        this.addLog(`${enemy.name} charges from the back line!`);
      }
      target._stunNextTurn = true;
      this.addLog(`${target.name} is stunned by the charge!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Stunned!', color: 'var(--red-bright)' });
    }

    // Shieldbearer: grant block to all other enemies
    if (action.blockAllEnemies) {
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + action.blockAllEnemies;
        }
      });
      this.addLog(`${enemy.name} ${action.text}. All enemies gain ${action.blockAllEnemies} Block.`);
    }

    // Guardian: grant block to front-row allies only
    if (action.blockFrontRow) {
      this.enemies.forEach(e => {
        if (!e.dead && e.row === 'front' && e !== enemy) {
          e.block = (e.block || 0) + action.blockFrontRow;
        }
      });
      this.addLog(`${enemy.name} ${action.text}. Front-row enemies gain ${action.blockFrontRow} Block.`);
    }

    // Guardian: grant block to self
    if (action.blockSelf) {
      enemy.block = (enemy.block || 0) + action.blockSelf;
      this.addLog(`${enemy.name} ${action.text}. Gains ${action.blockSelf} Block.`);
    }

    // Mire Leech: spawn another enemy
    if (action.spawn) {
      // Curse: Mother's Brood — enemies that can spawn always spawn on first opportunity
      const mothersBrood = this.getActiveCurses().includes('mothers_brood');
      const alreadySpawned = mothersBrood ? false : enemy._hasSpawned;
      const totalEnemies = this.enemies.filter(e => !e.dead).length;
      if (!alreadySpawned && totalEnemies < 5) {
        enemy._hasSpawned = true;
        const data = ENEMY_DATA[action.spawn];
        if (data) {
          const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
          const scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.65));
          const scaledActions = data.actions.map(a => ({
            ...a,
            damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.23)) : 0,
          }));
          const spawned = {
            index: this.enemies.length,
            ...data,
            maxHp: scaledMaxHp,
            hp: scaledMaxHp,
            actions: scaledActions,
            dead: false,
            poison: 0,
            block: 0,
            justSpawned: true,
          };
          this.enemies.push(spawned);
          this.addLog(`${enemy.name} ${action.text}! A new ${data.name} appears!`);
          setTimeout(() => { spawned.justSpawned = false; this.update(); }, 500);
        }
      } else if (!alreadySpawned) {
        this.addLog(`${enemy.name} tries to multiply but there's no room.`);
      } else {
        // Already spawned, do a basic attack instead
        this.addLog(`${enemy.name} writhes but cannot spawn again.`);
      }
    }
  }

  // Pre-roll enemy intents for display during player turn
  rollEnemyIntents() {
    this.enemies.forEach(e => {
      if (e.dead || e.isStructure) { e._intent = null; return; }
      if (e._skipNextAction) { e._intent = { type: 'stunned' }; return; }

      const alive = this.party.filter(u => !u.downed);
      if (alive.length === 0) { e._intent = null; return; }

      // Pick most likely action (filter by phase, cooldown, AI)
      let availableActions = e.actions;
      if (e.phaseShift) {
        const phase = e.row === 'back' ? 'ranged' : 'melee';
        const filtered = availableActions.filter(a => !a.phase || a.phase === phase);
        if (filtered.length > 0) availableActions = filtered;
      }
      if (!e._actionCooldowns) e._actionCooldowns = {};
      const offCD = availableActions.filter(a => !a.cooldown || !(e._actionCooldowns[a.name] > 0));
      if (offCD.length > 0) availableActions = offCD;

      // Weighted random pick
      const totalChance = availableActions.reduce((s, a) => s + a.chance, 0);
      const roll = Math.random() * totalChance;
      let cum = 0;
      let action = availableActions[0];
      for (const a of availableActions) { cum += a.chance; if (roll <= cum) { action = a; break; } }

      // Pick target
      const taunting = alive.find(u => u.taunt);
      let target;
      if (taunting) {
        target = taunting;
      } else if (e.ai === 'sniper') {
        target = alive.reduce((min, u) => u.hp < min.hp ? u : min, alive[0]);
      } else {
        target = alive[Math.floor(Math.random() * alive.length)];
      }

      const isAoe = action.aoe && action.damage > 0;
      e._intent = {
        action: action,
        targetIndex: target.index,
        targetName: target.name,
        isAoe: isAoe,
        isTaunted: !!taunting,
        isSniper: e.ai === 'sniper',
      };
    });
  }

  pickEnemyTarget(enemy, action) {
    const alive = this.party.filter(u => !u.downed);
    if (alive.length === 0) return null;
    const taunting = alive.find(u => u.taunt);
    if (taunting) return taunting;
    if (enemy.ai === 'sniper') {
      return alive.reduce((min, u) => u.hp < min.hp ? u : min, alive[0]);
    }

    // Ambush spread: avoid targeting the same unit if others haven't been hit
    if (this._ambushTargeted && alive.length > 1) {
      const untargeted = alive.filter(u => !this._ambushTargeted.has(u.index));
      if (untargeted.length > 0) {
        const target = untargeted[Math.floor(Math.random() * untargeted.length)];
        this._ambushTargeted.add(target.index);
        return target;
      }
    }
    if (this._ambushTargeted) {
      const target = alive[Math.floor(Math.random() * alive.length)];
      this._ambushTargeted.add(target.index);
      return target;
    }

    return alive[Math.floor(Math.random() * alive.length)];
  }

  checkPartyDowned() {
    this.party.forEach(u => {
      if (u.hp <= 0 && !u.downed) {
        // Praetorian passive: Unyielding — survive one lethal hit per encounter
        if (u.classId === 'praetorian' && !u._unyieldingUsed) {
          u._unyieldingUsed = true;
          u.hp = 1;
          this.addLog(`${u.name} refuses to fall! (Unyielding)`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Unyielding!', color: 'var(--gold)' });
          return;
        }
        // Lupa's Fang: first downing prevented (once per combat)
        if (!this._lupaFangUsed && this.partyHasItem('lupas_fang')) {
          this._lupaFangUsed = true;
          u.hp = 1;
          this.addLog(`Lupa's Fang glows — ${u.name} refuses to fall!`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: "Lupa's Fang!", color: '#cc44ff' });
          return;
        }
        u.downed = true;
        u.hp = 0;
        this.addLog(`${u.name} is downed!`);
        this.morale = Math.max(-100, this.morale - 20);
        if (this.onVisual) this.onVisual('morale', { amount: -20 });
      }
    });
    if (this.party.every(u => u.downed)) {
      this.phase = PHASE.DEFEAT;
      this.addLog('The last cohort falls...');
    }
  }

  // --- Skills / Leveling (party-wide XP) ---
  initSkills(unit) {
    unit.skills = unit.allSkills.filter(s => s.starter).map(s => ({ ...s }));
  }

  getUnlearnedSkills(unit) {
    const learnedIds = unit.skills.map(s => s.id);
    return unit.allSkills.filter(s => !learnedIds.includes(s.id));
  }

  getSkillChoices(unit, count = 2) {
    const unlearned = this.getUnlearnedSkills(unit);
    // Shuffle and pick `count`
    const shuffled = unlearned.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  teachSkill(unitIndex, skillId) {
    const unit = this.party[unitIndex];
    const skill = unit.allSkills.find(s => s.id === skillId);
    if (skill && !unit.skills.find(s => s.id === skillId)) {
      unit.skills.push({ ...skill });
    }
  }

  // Add encounter XP — grants a skill pick every 3 encounters
  addEncounterXP(isBoss) {
    const hasAnyUse = this.party.some(u => !u.downed);
    if (!hasAnyUse) return false;

    // Bosses always grant a pick immediately
    if (isBoss) {
      this.pendingSkillPicks++;
      return true;
    }

    this.encounterXP++;
    if (this.encounterXP >= 3) {
      this.encounterXP = 0;
      this.pendingSkillPicks++;
      return true;
    }
    return false;
  }

  // --- Equipment helpers ---
  unitHasItem(unit, itemId) {
    // Use cache if available
    if (unit._itemCache && unit._itemCache[itemId] !== undefined) return unit._itemCache[itemId];
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const equipped of unit.equipment[slot]) {
        if (!equipped) continue;
        if (equipped === itemId) {
          if (!unit._itemCache) unit._itemCache = {};
          unit._itemCache[itemId] = true;
          return true;
        }
        const item = ITEM_DATA[equipped];
        if (item && item.baseId === itemId) {
          if (!unit._itemCache) unit._itemCache = {};
          unit._itemCache[itemId] = true;
          return true;
        }
      }
    }
    if (!unit._itemCache) unit._itemCache = {};
    unit._itemCache[itemId] = false;
    return false;
  }

  partyHasItem(itemId) {
    return this.party.some(u => !u.downed && this.unitHasItem(u, itemId));
  }

  getItemLevel(unit, itemId) {
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const equipped of unit.equipment[slot]) {
        if (!equipped) continue;
        if (equipped === itemId) return 1;
        const item = ITEM_DATA[equipped];
        if (item && item.baseId === itemId) return item.level || 1;
      }
    }
    return 1;
  }

  getPartyItemLevel(itemId) {
    let maxLevel = 1;
    this.party.forEach(u => {
      if (!u.downed) {
        const lv = this.getItemLevel(u, itemId);
        if (lv > maxLevel) maxLevel = lv;
      }
    });
    return maxLevel;
  }

  computeEquipmentStats(unit) {
    unit._itemCache = {}; // invalidate item lookup cache
    unit.equipDamage = 0;
    unit.equipBlock = 0;
    unit.equipHeal = 0;
    unit.equipPoison = 0;
    unit.equipExtraDice = 0;
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const itemId of unit.equipment[slot]) {
        if (!itemId) continue;
        const item = getItemData(itemId);
        if (!item) continue;
        if (item.stats.damage) unit.equipDamage += item.stats.damage;
        if (item.stats.block) unit.equipBlock += item.stats.block;
        if (item.stats.heal) unit.equipHeal += item.stats.heal;
        if (item.stats.poison) unit.equipPoison += item.stats.poison;
        if (item.stats.extraDice) unit.equipExtraDice += item.stats.extraDice;
      }
    }
  }

  getExtraDiceCount() {
    let extra = 0;
    this.party.forEach(u => {
      if (!u.downed) {
        extra += (u.equipExtraDice || 0);
        // Signifer passive: +1 extra die while morale is 25+
        if (u.classId === 'signifer' && this.morale >= 25) extra += 1;
      }
    });
    return extra;
  }

  // Cornicen passive / Fate's Coin: can reroll 1 die per turn (never same value)
  canRerollDie() {
    if (!this.dicePool.rerollUsed && this.party.some(u => u.classId === 'cornicen' && !u.downed)) return true;
    if (!this.dicePool.itemRerollUsed && this.partyHasItem('fates_coin')) return true;
    return false;
  }

  rerollDie(dieId) {
    if (!this.canRerollDie()) return false;
    const die = this.dicePool.dice.find(d => d.id === dieId);
    if (!die || die.used) return false;
    const oldVal = die.value;
    // Reroll — never same value
    let newVal;
    do { newVal = Math.floor(Math.random() * 6) + 1; } while (newVal === oldVal);
    die.value = newVal;

    // Use class passive first, then item
    const hasCornicen = !this.dicePool.rerollUsed && this.party.some(u => u.classId === 'cornicen' && !u.downed);
    if (hasCornicen) {
      this.dicePool.rerollUsed = true;
      this.addLog(`Cornicen rerolls die: ${oldVal} → ${newVal}`);
    } else {
      this.dicePool.itemRerollUsed = true;
      this.addLog(`Fate's Coin rerolls die: ${oldVal} → ${newVal}`);
    }
    this.update();
    return true;
  }

  equipItem(unitIndex, itemId) {
    const unit = this.party[unitIndex];
    const item = getItemData(itemId);
    if (!item) return false;
    if (!canEquipItem(unit, item)) return false;

    const slots = unit.equipment[item.slot];
    // Find empty slot
    let slotIdx = slots.indexOf(null);
    if (slotIdx === -1) {
      // All full — replace the lowest rarity, then lowest level item
      const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3 };
      let worstIdx = 0;
      let worstRarity = 3;
      let worstLevel = 999;
      slots.forEach((id, si) => {
        const existing = id ? getItemData(id) : null;
        const r = existing ? (rarityOrder[existing.rarity] || 0) : 0;
        const lv = existing ? (existing.level || 1) : 0;
        if (r < worstRarity || (r === worstRarity && lv < worstLevel)) {
          worstRarity = r; worstLevel = lv; worstIdx = si;
        }
      });
      this.unequipSlot(unitIndex, item.slot, worstIdx);
      slotIdx = worstIdx;
    }

    slots[slotIdx] = itemId;
    if (item.stats.maxHp) {
      unit.maxHp += item.stats.maxHp;
      unit.hp += item.stats.maxHp;
    }
    this.computeEquipmentStats(unit);
    return true;
  }

  unequipSlot(unitIndex, slot, slotIdx) {
    const unit = this.party[unitIndex];
    const oldId = unit.equipment[slot][slotIdx];
    if (!oldId) return null;

    const oldItem = getItemData(oldId);
    unit.equipment[slot][slotIdx] = null;
    if (oldItem && oldItem.stats.maxHp) {
      unit.maxHp -= oldItem.stats.maxHp;
      unit.hp = Math.min(unit.hp, unit.maxHp);
      if (unit.hp < 1) unit.hp = 1;
    }
    this.computeEquipmentStats(unit);
    return oldId;
  }

  afterEncounter() {
    this.party.forEach(u => {
      if (u.downed) {
        u.downed = false;
        u.hp = Math.floor(u.maxHp * 0.5);
        this.addLog(`${u.name} recovers at ${u.hp} HP.`);
      }
    });
  }

  // --- Boss Phase Mechanics ---
  processBossPhases() {
    for (const boss of this.enemies) {
      if (!boss.isBoss || boss.dead) continue;

      // Arminius's Champion: spawns 2 raiders at 50% HP
      if (boss.id === 'arminius_champion' && !boss._phase50 && boss.hp <= boss.maxHp * 0.5) {
        boss._phase50 = true;
        boss.row = 'front';
        this.addLog(`${boss.name} roars and summons reinforcements!`);
        this.spawnBossMinion('cheruscan_raider');
        this.spawnBossMinion('cheruscan_raider');
      }

      // Grove Witch: summons healing totem at 66% and 33%, swaps to front
      if (boss.id === 'grove_witch') {
        if (!boss._phase66 && boss.hp <= boss.maxHp * 0.66) {
          boss._phase66 = true;
          if (boss.row !== 'front') { boss.row = 'front'; this.addLog(`${boss.name} surges forward!`); }
          this.spawnHealingTotem(boss);
        }
        if (!boss._phase33 && boss.hp <= boss.maxHp * 0.33) {
          boss._phase33 = true;
          if (boss.row !== 'front') { boss.row = 'front'; this.addLog(`${boss.name} surges forward!`); }
          this.spawnHealingTotem(boss);
        }
      }

      // Mire Mother: spawns wolves at 70% and 40% HP
      if (boss.id === 'mire_mother') {
        if (!boss._phase70 && boss.hp <= boss.maxHp * 0.7) {
          boss._phase70 = true;
          this.addLog(`${boss.name} bellows! Her brood answers!`);
          this.spawnBossMinion('boar_youngling');
          this.spawnBossMinion('boar_youngling');
        }
        if (!boss._phase40 && boss.hp <= boss.maxHp * 0.4) {
          boss._phase40 = true;
          this.addLog(`${boss.name} screams in fury! War boars crash through the undergrowth!`);
          this.spawnBossMinion('war_boar');
          this.spawnBossMinion('boar_youngling');
        }
      }
    }
  }

  spawnBossMinion(enemyId) {
    const data = ENEMY_DATA[enemyId];
    if (!data) return;
    if (this.enemies.filter(e => !e.dead).length >= 6) return;
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    const scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.65));
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
      poisonTarget: a.poisonTarget ? a.poisonTarget + diffBonus : undefined,
      blockAllEnemies: a.blockAllEnemies ? a.blockAllEnemies + diffBonus : undefined,
      blockFrontRow: a.blockFrontRow ? a.blockFrontRow + diffBonus : undefined,
      blockSelf: a.blockSelf ? a.blockSelf + diffBonus : undefined,
    }));
    const enemy = {
      index: this.enemies.length,
      ...data,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
      actions: scaledActions,
      dead: false,
      poison: 0,
      block: 0,
      justSpawned: true,
    };
    this.enemies.push(enemy);
    this.addLog(`${data.name} joins the fight!`);
    setTimeout(() => { enemy.justSpawned = false; this.update(); }, 500);
  }

  spawnHealingTotem(boss) {
    if (this.enemies.filter(e => !e.dead).length >= 6) return;
    const totem = {
      index: this.enemies.length,
      id: 'healing_totem',
      name: 'Healing Totem',
      maxHp: 12,
      hp: 12,
      row: 'back',
      damage: [0, 0],
      speed: 0,
      xpValue: 3,
      ai: 'passive',
      isStructure: true,
      healBoss: 5 + (Math.max(0, (this.difficulty || 1) - 1) * 2),
      healBossId: boss.id,
      dead: false,
      poison: 0,
      block: 0,
      justSpawned: true,
      description: `A living totem of twisted roots. Heals the Grove Witch for ${5 + (Math.max(0, (this.difficulty || 1) - 1) * 2)} HP each turn. Destroy it to stop the healing.`,
      actions: [{ name: 'Pulsing Roots', damage: 0, chance: 1.0, text: `pulses with green energy — heals the Witch for ${5 + (Math.max(0, (this.difficulty || 1) - 1) * 2)} HP` }],
    };
    this.enemies.push(totem);
    // Grove Witch gains block when summoning a totem (3 x difficulty)
    const totemBlock = 3 * (this.difficulty || 1);
    boss.block = (boss.block || 0) + totemBlock;
    this.addLog(`A Healing Totem sprouts from the ground! ${boss.name} gains ${totemBlock} Block.`);
    setTimeout(() => { totem.justSpawned = false; this.update(); }, 500);
  }

  // Check if current encounter has a boss
  hasBossEnemy() {
    return this.enemies.some(e => e.isBoss);
  }

  // --- Curse helpers ---
  getActiveCurses() {
    return (window.game && window.game.activeCurses) ? window.game.activeCurses : [];
  }

  update() {
    if (this.onUpdate) this.onUpdate();
  }
}
