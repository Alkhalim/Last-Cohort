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
    this.dicePool = new DicePool(5);
    this.morale = 50;
    this.phase = PHASE.PRE_COMBAT;
    this.turn = 0;
    this.log = [];
    this.targetMode = null;
    this.onUpdate = null;
    this.onVisual = null;
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
        actedThisTurn: false,
        conditions: [],
        // Per-encounter stats
        stats: { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0 },
      };
    });
  }

  initEncounter(encounterDef) {
    this.enemyDefs = encounterDef.enemies;
    this.enemies = [];
    this.spawnIndex = 0;
    this.turn = 0;
    this.log = [];
    this.phase = PHASE.PRE_COMBAT;
    this.currentEncounterDef = encounterDef;
    this.targetMode = null;
    this.party.forEach(u => {
      u.block = 0;
      u.taunt = false;
      u.bonusDamage = 0;
      u.passiveTriggered = false;
      u.actedThisTurn = false;
      u.stats = { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0 };
      if (u.passive) u.passive.triggered = false;
    });
    this.addLog(encounterDef.intro);
  }

  beginSpawning() {
    this.phase = PHASE.SPAWNING;
    this.spawnIndex = 0;
    this.spawnNextEnemy();
  }

  spawnNextEnemy() {
    if (this.spawnIndex >= this.enemyDefs.length) {
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
      justSpawned: true,
    };
    this.enemies.push(enemy);
    this.addLog(`${enemy.name} appears!`);
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
  startRollPhase() {
    this.turn++;
    this.phase = PHASE.ROLLING;
    this.party.forEach(u => {
      u.block = 0;
      u.taunt = false;
      u.bonusDamage = 0;
      u.actedThisTurn = false;
    });
    this.dicePool.adjustUsed = false;
    this.targetMode = null;
    this.addLog(`— Turn ${this.turn} —`);

    // Roll dice internally, then reveal one by one via UI
    this.dicePool.roll();
    this.update(); // UI will handle the staggered reveal
  }

  onDiceRevealed() {
    // Called by UI after all dice are shown
    this.phase = PHASE.PLAYER_TURN;
    const vals = this.dicePool.dice.map(d => d.value).join(', ');
    this.addLog(`Dice: [${vals}]`);
    this.update();
  }

  // --- Centurion passive ---
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

  // Auto-pick the best dice for a skill cost
  autoPick(skill) {
    const available = this.dicePool.getAvailable();
    const cost = skill.cost;

    switch (cost.type) {
      case 'any':
        // Pick lowest die
        return available.length > 0 ? [available.reduce((min, d) => d.value < min.value ? d : min, available[0]).id] : [];
      case 'threshold':
        // Pick lowest die that meets threshold
        const valid = available.filter(d => d.value >= cost.min).sort((a, b) => a.value - b.value);
        return valid.length > 0 ? [valid[0].id] : [];
      case 'exact':
        const exact = available.find(d => d.value === cost.val);
        return exact ? [exact.id] : [];
      case 'combined': {
        // Find pair with lowest total that meets threshold
        let bestPair = null;
        let bestSum = Infinity;
        for (let i = 0; i < available.length; i++) {
          for (let j = i + 1; j < available.length; j++) {
            const sum = available[i].value + available[j].value;
            if (sum >= cost.min && sum < bestSum) {
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
    const front = alive.filter(e => e.row === 'front');
    if (front.length > 0) return front;
    return alive;
  }

  executeSkill(unitIndex, skillId, diceIds, targets) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);

    diceIds.forEach(id => this.dicePool.useDie(id));
    const result = skill.execute(unit, targets, diceIds.map(id => this.dicePool.dice.find(d => d.id === id)));

    this.applySkillResult(unit, result);
    this.addLog(result.text);

    // Mark unit as acted
    unit.actedThisTurn = true;

    this.checkEnemyDeaths();
    if (this.enemies.every(e => e.dead)) {
      this.phase = PHASE.VICTORY;
      this.addLog('All enemies defeated!');
    }

    this.update();
  }

  applySkillResult(unit, result) {
    if (result.damage && result.target && result.target.hp !== undefined) {
      let dmg = result.damage + (unit.bonusDamage || 0);
      result.target.hp = Math.max(0, result.target.hp - dmg);
      unit.stats.damageDealt += dmg;
    }
    if (result.heal && result.target) {
      const before = result.target.hp;
      result.target.hp = Math.min(result.target.maxHp, result.target.hp + result.heal);
      const actual = result.target.hp - before;
      unit.stats.healingDone += actual;
      if (actual > 0 && this.onVisual) {
        this.onVisual('unitHeal', { unitIndex: result.target.index, amount: actual });
      }
    }
    if (result.selfDamage) {
      unit.hp = Math.max(1, unit.hp - result.selfDamage);
      unit.stats.damageTaken += result.selfDamage;
    }
    if (result.block && result.target) {
      result.target.block = (result.target.block || 0) + result.block;
      unit.stats.blockGenerated += result.block;
    }
    if (result.taunt) {
      unit.taunt = true;
    }
    if (result.blockAll) {
      this.party.forEach(u => {
        if (!u.downed) u.block = (u.block || 0) + result.blockAll;
      });
      unit.stats.blockGenerated += result.blockAll * this.party.filter(u => !u.downed).length;
    }
    if (result.buffAllies) {
      this.party.forEach(u => {
        if (!u.downed) u.bonusDamage = (u.bonusDamage || 0) + (result.buffAllies.bonusDamage || 0);
      });
    }
    if (result.morale) {
      const oldMorale = this.morale;
      this.morale = Math.max(-100, Math.min(100, this.morale + result.morale));
      if (result.morale > 0) {
        unit.stats.moraleRestored += this.morale - oldMorale;
      }
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
    setTimeout(() => this.executeEnemyTurn(), 600);
  }

  // --- Enemy turn (sequential) ---
  executeEnemyTurn() {
    const alive = this.enemies.filter(e => !e.dead);
    if (alive.length === 0) return;
    this.executeEnemySequence(alive, 0);
  }

  executeEnemySequence(enemies, index) {
    if (index >= enemies.length || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
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

    setTimeout(() => this.executeEnemySequence(enemies, index + 1), 800);
  }

  executeEnemyAction(enemy) {
    const roll = Math.random();
    let cumulative = 0;
    let action = enemy.actions[0];
    for (const a of enemy.actions) {
      cumulative += a.chance;
      if (roll <= cumulative) { action = a; break; }
    }

    const target = this.pickEnemyTarget(enemy, action);
    if (!target) return;

    if (this.onVisual) {
      this.onVisual('enemyAttack', { enemyIndex: enemy.index });
    }

    if (action.damage > 0) {
      let dmg = action.damage;
      if (target.block > 0) {
        const absorbed = Math.min(target.block, dmg);
        target.block -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) {
          this.addLog(`${target.name}'s block absorbs ${absorbed} damage.`);
        }
      }
      target.hp = Math.max(0, target.hp - dmg);
      target.stats.damageTaken += dmg;
      this.addLog(`${enemy.name} ${action.text} at ${target.name} for ${action.damage} damage${dmg < action.damage ? ` (${dmg} after block)` : ''}.`);

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
  }

  pickEnemyTarget(enemy, action) {
    const alive = this.party.filter(u => !u.downed);
    if (alive.length === 0) return null;
    const taunting = alive.find(u => u.taunt);
    if (taunting) return taunting;
    if (enemy.ai === 'sniper') {
      return alive.reduce((min, u) => u.hp < min.hp ? u : min, alive[0]);
    }
    return alive[Math.floor(Math.random() * alive.length)];
  }

  checkPartyDowned() {
    this.party.forEach(u => {
      if (u.hp <= 0 && !u.downed) {
        u.downed = true;
        u.hp = 0;
        this.addLog(`${u.name} is downed!`);
        this.morale = Math.max(-100, this.morale - 15);
        const medicus = this.party.find(p => p.classId === 'medicus' && !p.downed && p !== u);
        if (medicus) {
          this.addLog('Field Triage: Medicus gains a free Bind Wounds.');
          medicus.passive.freeHealAvailable = true;
        }
      }
    });
    if (this.party.every(u => u.downed)) {
      this.phase = PHASE.DEFEAT;
      this.addLog('The last cohort falls...');
    }
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

  update() {
    if (this.onUpdate) this.onUpdate();
  }
}
