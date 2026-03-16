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
    this.turnCount = 0;
    this.log = [];
    this.targetMode = null;
    this.onUpdate = null;
    this.onVisual = null;
    this.difficulty = 1;
    this.totalEnemiesKilled = 0;
    this.encountersCompleted = 0;
    this.totalRenownEarned = 0;
    this.partyXp = 0;
    this.partyLevel = 1;
    this.pendingLevelUps = 0;
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
        equipment: { weapon: [null, null], armor: [null, null], trinket: [null, null, null] },
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
    this.targetMode = null;
    this.killedEnemies = [];
    this.party.forEach(u => {
      u.block = 0;
      u.taunt = false;
      u.buffs = [];
      u.passiveTriggered = false;
      u.actedThisTurn = false;
      u.stats = { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0 };
      if (u.passive) u.passive.triggered = false;
      this.computeEquipmentStats(u);
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
    // Difficulty scaling: +20% HP and +1 damage per action per difficulty above 1
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    const scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.2));
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? a.damage + diffBonus : 0,
    }));
    const enemy = {
      index: this.spawnIndex,
      ...data,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
      actions: scaledActions,
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
  // Calculate renown earned from a completed encounter
  calculateRenown() {
    const baseRenown = this.killedEnemies.reduce((sum, eid) => {
      const data = ENEMY_DATA[eid];
      return sum + (data ? (data.xpValue || 0) * 2 : 0);
    }, 0);
    const bonusMultiplier = Math.max(0.5, 1.5 - (this.turnCount * 0.1));
    return Math.round(baseRenown * bonusMultiplier);
  }

  startRollPhase() {
    this.turn++;
    this.turnCount++;
    this.phase = PHASE.ROLLING;
    this.party.forEach(u => {
      u.taunt = false;
      u.actedThisTurn = false;
    });
    this.dicePool.adjustUsed = false;
    this.targetMode = null;
    this.addLog(`\u2014 Turn ${this.turn} \u2014`);

    // Roll dice — base 5 + extra from equipment
    const extraDice = this.getExtraDiceCount();
    this.dicePool.count = 5 + extraDice;
    this.dicePool.roll();
    this.update();
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
      this.addLog(`Centurion adjusts die: ${oldVal} \u2192 ${die.value}`);
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

    const logText = this.applySkillResult(unit, skill, result);
    this.addLog(logText);

    // Mark unit as acted
    unit.actedThisTurn = true;

    this.checkEnemyDeaths();
    if (this.enemies.every(e => e.dead)) {
      this.phase = PHASE.VICTORY;
      this.addLog('All enemies defeated!');
      this.update();
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
    // Morale damage modifier: +1 at Inspired, -1 at Broken
    let moraleDmg = 0;
    if (this.morale >= 75) moraleDmg = 1;
    else if (this.morale <= -75) moraleDmg = -1;
    // Consume buff damage only when actually dealing damage
    const buffDmg = (result.damage && result.target) ? this.consumeBuffDamage(unit) : 0;
    const bonusDmg = buffDmg + (unit.equipDamage || 0) + moraleDmg;
    const bonusBlock = unit.equipBlock || 0;
    const bonusHeal = unit.equipHeal || 0;

    if (result.damage && result.target && result.target.hp !== undefined) {
      const total = result.damage + bonusDmg;
      result.target.hp = Math.max(0, result.target.hp - total);
      unit.stats.damageDealt += total;
      const bonusStr = bonusDmg > 0 ? ` (${result.damage}+${bonusDmg})` : '';
      parts.push(`${unit.name} uses ${skill.name} on ${result.target.name} for ${total}${bonusStr} damage.`);
    }
    if (result.heal && result.target) {
      const totalHeal = result.heal + bonusHeal;
      const before = result.target.hp;
      result.target.hp = Math.min(result.target.maxHp, result.target.hp + totalHeal);
      const actual = result.target.hp - before;
      unit.stats.healingDone += actual;
      const bonusStr = bonusHeal > 0 ? ` (${result.heal}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals ${result.target.name} for ${actual}${bonusStr} HP.`);
      if (actual > 0 && this.onVisual) {
        this.onVisual('unitHeal', { unitIndex: result.target.index, amount: actual });
      }
    }
    if (result.selfDamage) {
      unit.hp = Math.max(1, unit.hp - result.selfDamage);
      unit.stats.damageTaken += result.selfDamage;
      parts.push(`(${unit.name} takes ${result.selfDamage} self-damage.)`);
    }
    if (result.block && result.target) {
      const totalBlock = result.block + bonusBlock;
      result.target.block = (result.target.block || 0) + totalBlock;
      unit.stats.blockGenerated += totalBlock;
      const bonusStr = bonusBlock > 0 ? ` (${result.block}+${bonusBlock})` : '';
      if (!result.damage && !result.heal) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 ${totalBlock}${bonusStr} Block.`);
      }
    }
    if (result.taunt) {
      unit.taunt = true;
      if (parts.length > 0) parts[parts.length - 1] += ' Taunting!';
    }
    if (result.blockAll) {
      const totalBlock = result.blockAll + bonusBlock;
      const count = this.party.filter(u => !u.downed).length;
      this.party.forEach(u => { if (!u.downed) u.block = (u.block || 0) + totalBlock; });
      unit.stats.blockGenerated += totalBlock * count;
      const bonusStr = bonusBlock > 0 ? ` (${result.blockAll}+${bonusBlock})` : '';
      if (!result.damage && !result.heal && !result.block) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 all gain ${totalBlock}${bonusStr} Block.`);
      }
    }
    if (result.buffAllies) {
      const attacks = result.buffAllies.attacks || 1;
      this.party.forEach(u => {
        if (!u.downed) {
          u.buffs.push({ damage: result.buffAllies.bonusDamage || 0, attacksLeft: attacks });
        }
      });
      const attackStr = attacks === 1 ? 'next attack' : `next ${attacks} attacks`;
      if (!result.damage && !result.heal && !result.block && !result.blockAll) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 allies gain +${result.buffAllies.bonusDamage} damage (${attackStr}).`);
      }
    }
    if (result.morale) {
      const oldMorale = this.morale;
      this.morale = Math.max(-100, Math.min(100, this.morale + result.morale));
      if (result.morale > 0) unit.stats.moraleRestored += this.morale - oldMorale;
      parts.push(`+${result.morale} Morale.`);
    }
    if (parts.length === 0) parts.push(`${unit.name} uses ${skill.name}.`);
    return parts.join(' ');
  }

  checkEnemyDeaths() {
    this.enemies.forEach(e => {
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        e.hp = 0;
        this.killedEnemies.push(e.id);
        this.totalEnemiesKilled++;
        this.addLog(`${e.name} falls!`);
      }
    });
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

    // Boss enrage: if boss is below 50% HP, attack twice
    if (enemy.isBoss && enemy.hp > 0 && !enemy.dead && enemy.hp <= enemy.maxHp * 0.5) {
      this.addLog(`${enemy.name} is enraged and strikes again!`);
      this.executeEnemySingleAction(enemy);
    }

    this.checkPartyDowned();
    this.update();

    setTimeout(() => this.executeEnemySequence(enemies, index + 1), 800);
  }

  executeEnemyAction(enemy) {
    this.executeEnemySingleAction(enemy);
  }

  executeEnemySingleAction(enemy) {
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

  // --- Skills / Leveling (party-wide XP) ---
  initSkills(unit) {
    // Start with level-1 skills only
    unit.skills = unit.allSkills.filter(s => (s.unlockLevel || 1) <= 1).map(s => ({ ...s }));
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

  awardPartyXp(amount) {
    const oldLevel = this.partyLevel;
    this.partyXp += amount;
    this.partyLevel = getLevelForXp(this.partyXp);
    const levelsGained = this.partyLevel - oldLevel;
    if (levelsGained > 0) {
      this.addLog(`Party reached level ${this.partyLevel}!`);
    }
    return levelsGained;
  }

  // --- Equipment (2 weapon, 2 armor, 3 trinket) ---
  computeEquipmentStats(unit) {
    unit.equipDamage = 0;
    unit.equipBlock = 0;
    unit.equipHeal = 0;
    unit.equipExtraDice = 0;
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const itemId of unit.equipment[slot]) {
        if (!itemId) continue;
        const item = getItemData(itemId);
        if (!item) continue;
        if (item.stats.damage) unit.equipDamage += item.stats.damage;
        if (item.stats.block) unit.equipBlock += item.stats.block;
        if (item.stats.heal) unit.equipHeal += item.stats.heal;
        if (item.stats.extraDice) unit.equipExtraDice += item.stats.extraDice;
      }
    }
  }

  getExtraDiceCount() {
    let extra = 0;
    this.party.forEach(u => {
      if (!u.downed) extra += (u.equipExtraDice || 0);
    });
    return extra;
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
      // All full — replace the first slot
      this.unequipSlot(unitIndex, item.slot, 0);
      slotIdx = 0;
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

  // Check if current encounter has a boss
  hasBossEnemy() {
    return this.enemies.some(e => e.isBoss);
  }

  update() {
    if (this.onUpdate) this.onUpdate();
  }
}
