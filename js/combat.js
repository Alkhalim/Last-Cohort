// ============================================================
// Last Cohort – Combat Engine
// ============================================================

const PHASE = {
  PRE_COMBAT: 'pre_combat',
  SPAWNING: 'spawning',
  ROLL: 'roll',
  PLAYER_TURN: 'player_turn',
  RESOLVE: 'resolve',
  ENEMY_TURN: 'enemy_turn',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

class CombatEngine {
  constructor() {
    this.party = [];
    this.enemies = [];
    this.dicePool = new DicePool(5);
    this.morale = 50;
    this.phase = PHASE.PRE_COMBAT;
    this.turn = 0;
    this.log = [];
    this.pendingActions = []; // queued skill activations
    this.selectedDie = null;
    this.selectedUnit = null;
    this.targetMode = null;  // { unitIndex, skillId, skill, diceIds }
    this.onUpdate = null;    // UI callback
    this.encounterIndex = 0;
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
        hp: data.maxHp,
        block: 0,
        downed: false,
        skills: data.skills.map(s => ({ ...s })),
        passive: { ...data.passive },
        passiveTriggered: false,
        bonusDamage: 0,
        taunt: false,
        conditions: [],
      };
    });
  }

  initEncounter(encounterDef) {
    this.enemyDefs = encounterDef.enemies; // store for spawning
    this.enemies = [];
    this.spawnIndex = 0;
    this.turn = 0;
    this.log = [];
    this.phase = PHASE.PRE_COMBAT;
    this.currentEncounterDef = encounterDef;
    // Reset per-encounter state
    this.party.forEach(u => {
      u.block = 0;
      u.taunt = false;
      u.bonusDamage = 0;
      u.passiveTriggered = false;
      if (u.passive) u.passive.triggered = false;
    });
    this.addLog(encounterDef.intro);
  }

  // Spawn enemies one by one with callback for animation timing
  beginSpawning() {
    this.phase = PHASE.SPAWNING;
    this.spawnIndex = 0;
    this.spawnNextEnemy();
  }

  spawnNextEnemy() {
    if (this.spawnIndex >= this.enemyDefs.length) {
      // All spawned — move to roll phase
      this.addLog('Prepare yourselves!');
      this.startRollPhase();
      return;
    }
    const eid = this.enemyDefs[this.spawnIndex];
    const data = ENEMY_DATA[eid];
    const enemy = {
      index: this.spawnIndex,
      ...data,
      hp: data.maxHp,
      dead: false,
      justSpawned: true, // for CSS animation
    };
    this.enemies.push(enemy);
    this.addLog(`${enemy.name} appears!`);
    this.spawnIndex++;
    this.update();
    // Clear justSpawned flag after animation, then spawn next
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
  startRollPhase() {
    this.turn++;
    this.phase = PHASE.ROLL;
    // Reset per-turn state
    this.party.forEach(u => {
      u.block = 0;
      u.taunt = false;
      u.bonusDamage = 0;
    });
    // Reset centurion passive
    this.dicePool.adjustUsed = false;
    this.selectedDie = null;
    this.selectedUnit = null;
    this.targetMode = null;
    this.addLog(`— Turn ${this.turn} —`);
    this.update();
  }

  rollDice() {
    if (this.phase !== PHASE.ROLL) return;
    this.dicePool.roll();
    this.phase = PHASE.PLAYER_TURN;
    const vals = this.dicePool.dice.map(d => d.value).join(', ');
    this.addLog(`Dice rolled: [${vals}]`);
    this.update();
  }

  // --- Centurion passive: adjust die ---
  canAdjustDie() {
    return !this.dicePool.adjustUsed && this.party.some(u => u.classId === 'centurion' && !u.downed);
  }

  adjustDie(dieId, direction) {
    if (!this.canAdjustDie()) return false;
    const die = this.dicePool.dice.find(d => d.id === dieId);
    if (!die) return false;
    const oldVal = die.value;
    if (this.dicePool.adjustDie(dieId, direction)) {
      this.addLog(`Centurion adjusts die: ${oldVal} → ${die.value}`);
      this.update();
      return true;
    }
    return false;
  }

  // --- Skill activation ---
  getValidSkills(unitIndex) {
    const unit = this.party[unitIndex];
    if (!unit || unit.downed) return [];
    const available = this.dicePool.getAvailable();

    return unit.skills.map(skill => {
      const canUse = this.canUseSkill(unitIndex, skill, available);
      return { ...skill, canUse };
    });
  }

  canUseSkill(unitIndex, skill, available) {
    if (!available) available = this.dicePool.getAvailable();
    const cost = skill.cost;

    switch (cost.type) {
      case 'any':
        return available.length >= 1;
      case 'threshold':
        return available.some(d => d.value >= cost.min);
      case 'exact':
        return available.some(d => d.value === cost.val);
      case 'combined':
        return this.findCombinedDice(available, cost.dice, cost.min, '>=');
      case 'combinedExact':
        return this.findCombinedDice(available, cost.dice, cost.val, '===');
      default:
        return false;
    }
  }

  findCombinedDice(available, count, target, op) {
    if (available.length < count) return false;
    // For 2-dice combos, brute force check
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

  // Begin targeting for a skill
  beginSkillTarget(unitIndex, skillId, diceIds) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);
    if (!skill) return;

    // Validate dice payment
    if (!this.dicePool.canPayCost(skill.cost, diceIds)) {
      this.addLog('Invalid dice for this skill.');
      this.update();
      return;
    }

    // Determine if we need target selection
    if (skill.target === TARGET.SINGLE_ENEMY) {
      const validTargets = this.getValidEnemyTargets(skill);
      if (validTargets.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [validTargets[0]]);
      } else if (validTargets.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'enemy' };
        this.update();
      }
    } else if (skill.target === TARGET.SINGLE_ALLY) {
      const aliveAllies = this.party.filter(u => !u.downed);
      if (aliveAllies.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [aliveAllies[0]]);
      } else {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'ally' };
        this.update();
      }
    } else {
      // Self, all allies, all enemies — no targeting needed
      this.executeSkill(unitIndex, skillId, diceIds, []);
    }
  }

  selectTarget(target) {
    if (!this.targetMode) return;
    const { unitIndex, skillId, diceIds } = this.targetMode;
    this.executeSkill(unitIndex, skillId, diceIds, [target]);
    this.targetMode = null;
  }

  cancelTarget() {
    this.targetMode = null;
    this.update();
  }

  getValidEnemyTargets(skill) {
    const alive = this.enemies.filter(e => !e.dead);
    if (skill.ignoreRow) return alive;
    // Can only hit front row if front row has living enemies
    const front = alive.filter(e => e.row === 'front');
    if (front.length > 0) return front;
    return alive; // If no front row, back row is exposed
  }

  executeSkill(unitIndex, skillId, diceIds, targets) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);

    // Consume dice
    diceIds.forEach(id => this.dicePool.useDie(id));

    // Execute skill effect
    const result = skill.execute(unit, targets, diceIds.map(id => this.dicePool.dice.find(d => d.id === id)));

    // Apply results
    this.applySkillResult(unit, result);
    this.addLog(result.text);

    // Check for enemy deaths
    this.checkEnemyDeaths();
    // Check victory
    if (this.enemies.every(e => e.dead)) {
      this.phase = PHASE.VICTORY;
      this.addLog('All enemies defeated!');
    }

    this.update();
  }

  applySkillResult(unit, result) {
    // Damage to single target
    if (result.damage && result.target && result.target.hp !== undefined) {
      let dmg = result.damage + (unit.bonusDamage || 0);
      result.target.hp = Math.max(0, result.target.hp - dmg);
    }

    // Healing
    if (result.heal && result.target) {
      const t = result.target;
      t.hp = Math.min(t.maxHp, t.hp + result.heal);
    }

    // Self damage (Sawbones)
    if (result.selfDamage) {
      unit.hp = Math.max(1, unit.hp - result.selfDamage);
    }

    // Block to self
    if (result.block && result.target) {
      result.target.block = (result.target.block || 0) + result.block;
    }

    // Taunt
    if (result.taunt) {
      unit.taunt = true;
    }

    // Block all allies
    if (result.blockAll) {
      this.party.forEach(u => {
        if (!u.downed) u.block = (u.block || 0) + result.blockAll;
      });
    }

    // Buff all allies damage
    if (result.buffAllies) {
      this.party.forEach(u => {
        if (!u.downed) u.bonusDamage = (u.bonusDamage || 0) + (result.buffAllies.bonusDamage || 0);
      });
    }

    // Morale
    if (result.morale) {
      this.morale = Math.max(-100, Math.min(100, this.morale + result.morale));
    }
  }

  checkEnemyDeaths() {
    this.enemies.forEach(e => {
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        e.hp = 0;
        this.addLog(`${e.name} falls!`);
      }
    });
  }

  // --- End player turn ---
  endPlayerTurn() {
    if (this.phase !== PHASE.PLAYER_TURN) return;
    this.phase = PHASE.ENEMY_TURN;
    this.update();
    // Small delay before enemy actions for readability
    setTimeout(() => this.executeEnemyTurn(), 600);
  }

  // --- Enemy turn (sequential with delays for visual impact) ---
  executeEnemyTurn() {
    const alive = this.enemies.filter(e => !e.dead);
    if (alive.length === 0) return;

    this.executeEnemySequence(alive, 0);
  }

  executeEnemySequence(enemies, index) {
    if (index >= enemies.length || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
      // All enemy actions done — check downed, then next turn
      this.checkPartyDowned();
      if (this.phase !== PHASE.DEFEAT && this.phase !== PHASE.VICTORY) {
        setTimeout(() => this.startRollPhase(), 400);
      } else {
        this.update();
      }
      return;
    }

    const enemy = enemies[index];
    this.executeEnemyAction(enemy);
    this.checkPartyDowned();
    this.update();

    // Delay before next enemy acts
    setTimeout(() => this.executeEnemySequence(enemies, index + 1), 800);
  }

  executeEnemyAction(enemy) {
    // Pick action by weighted chance
    const roll = Math.random();
    let cumulative = 0;
    let action = enemy.actions[0];
    for (const a of enemy.actions) {
      cumulative += a.chance;
      if (roll <= cumulative) { action = a; break; }
    }

    // Pick target
    const target = this.pickEnemyTarget(enemy, action);
    if (!target) return;

    // Visual: flash the attacking enemy
    if (this.onVisual) {
      this.onVisual('enemyAttack', { enemyIndex: enemy.index });
    }

    if (action.damage > 0) {
      let dmg = action.damage;
      // Apply block
      if (target.block > 0) {
        const absorbed = Math.min(target.block, dmg);
        target.block -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) {
          this.addLog(`${target.name}'s block absorbs ${absorbed} damage.`);
        }
      }
      target.hp = Math.max(0, target.hp - dmg);
      this.addLog(`${enemy.name} ${action.text} at ${target.name} for ${action.damage} damage${dmg < action.damage ? ` (${dmg} after block)` : ''}.`);

      // Visual: flash hit unit + damage popup
      if (this.onVisual) {
        this.onVisual('unitHit', { unitIndex: target.index, damage: dmg });
      }
    }

    if (action.morale) {
      this.morale = Math.max(-100, Math.min(100, this.morale + action.morale));
      this.addLog(`${enemy.name} ${action.text}! Morale ${action.morale > 0 ? '+' : ''}${action.morale}.`);

      if (this.onVisual) {
        this.onVisual('morale', { amount: action.morale });
      }
    }

    // AOE
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
          if (this.onVisual) {
            this.onVisual('unitHit', { unitIndex: u.index, damage: aoeDmg });
          }
        }
      });
      this.addLog(`${enemy.name}'s attack hits the whole line!`);
    }
  }

  pickEnemyTarget(enemy, action) {
    const alive = this.party.filter(u => !u.downed);
    if (alive.length === 0) return null;

    // Taunt takes priority
    const taunting = alive.find(u => u.taunt);
    if (taunting) return taunting;

    // AI behavior
    if (enemy.ai === 'sniper') {
      // Target lowest HP
      return alive.reduce((min, u) => u.hp < min.hp ? u : min, alive[0]);
    }

    // Default: random target
    return alive[Math.floor(Math.random() * alive.length)];
  }

  checkPartyDowned() {
    this.party.forEach(u => {
      if (u.hp <= 0 && !u.downed) {
        u.downed = true;
        u.hp = 0;
        this.addLog(`${u.name} is downed!`);
        this.morale = Math.max(-100, this.morale - 15);
        // Medicus passive: Field Triage
        const medicus = this.party.find(p => p.classId === 'medicus' && !p.downed && p !== u);
        if (medicus) {
          this.addLog('Field Triage: Medicus gains a free Bind Wounds.');
          medicus.passive.freeHealAvailable = true;
        }
      }
    });

    // All downed = defeat
    if (this.party.every(u => u.downed)) {
      this.phase = PHASE.DEFEAT;
      this.addLog('The last cohort falls...');
    }
  }

  // --- Post-encounter ---
  afterEncounter() {
    // Revive downed units at 50% HP
    this.party.forEach(u => {
      if (u.downed) {
        u.downed = false;
        u.hp = Math.floor(u.maxHp * 0.5);
        this.addLog(`${u.name} recovers at ${u.hp} HP.`);
      }
    });
  }

  // --- Utility ---
  update() {
    if (this.onUpdate) this.onUpdate();
  }
}
