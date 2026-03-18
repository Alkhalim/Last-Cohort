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
      // Preserve camp-granted block and buffs, only reset combat-specific state
      u.taunt = false;
      u.poison = 0;
      u.passiveTriggered = false;
      u.actedThisTurn = false;
      u.stats = { damageDealt: 0, healingDone: 0, blockGenerated: 0, moraleRestored: 0, damageTaken: 0 };
      if (u.passive) u.passive.triggered = false;
      this.computeEquipmentStats(u);
    });

    // Special: Arm Ring of Arminius — +10 morale at encounter start
    if (this.partyHasItem('arm_ring_of_arminius')) {
      this.morale = Math.min(100, this.morale + 10);
      this.addLog('The Arm Ring of Arminius fills the men with defiance. (+10 Morale)');
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
      this.addLog('Prepare yourselves!');
      this.startRollPhase();
      return;
    }
    const eid = this.enemyDefs[this.spawnIndex];
    const data = ENEMY_DATA[eid];
    // Difficulty scaling: +20% HP and +1 damage per action per difficulty above 1
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    let scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.55));
    // Curse: Champion's Mark — bosses have +20% HP
    if (data.isBoss && this.getActiveCurses().includes('champions_mark')) {
      scaledMaxHp = Math.round(scaledMaxHp * 1.2);
    }
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.23)) : 0,
    }));
    const enemy = {
      index: this.spawnIndex,
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
    this.addLog(`${enemy.name} appears!`);

    // Runecarver: grant block to all other enemies when spawning
    if (data.startBlockAllEnemies) {
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + data.startBlockAllEnemies;
        }
      });
      this.addLog(`${enemy.name} carves runes — all enemies gain ${data.startBlockAllEnemies} Block!`);
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
    return Math.round(baseRenown * bonusMultiplier);
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
        e.hp = Math.max(0, e.hp - e.poison);
        this.addLog(`${e.name} takes ${e.poison} poison damage.`);
        e.poison = Math.max(0, e.poison - 1);
        if (e.hp <= 0) { e.dead = true; e.hp = 0; this.killedEnemies.push(e.id); this.totalEnemiesKilled++; this.addLog(`${e.name} falls to poison!`); }
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
        u.hp = Math.max(1, u.hp - u.poison);
        this.addLog(`${u.name} takes ${u.poison} poison damage.`);
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
          }
        });
        this.addLog(`${e.name} burns — all soldiers take ${e.turnDamageAll} damage!`);
      }
    });

    // Morale decay — escalates each turn. Turn 1: -1, Turn 2: -2, etc.
    // Champion's Helm reduces decay by 1 per helm equipped
    // Curse: Witch's Gaze — morale decay +2 per turn
    const helmReduction = this.party.filter(u => !u.downed && this.unitHasItem(u, 'champions_helm')).length;
    const curseDecay = this.getActiveCurses().includes('witchs_gaze') ? 2 : 0;
    const moraleDecay = Math.max(0, this.turn + curseDecay - helmReduction);
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
      if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
        this.triggerVictory();
        return;
      }
    }

    this.party.forEach(u => {
      if (this.turn > 1) u.block = 0; // preserve camp block on turn 1
      u.taunt = false;
      u.actedThisTurn = false;
    });
    this.dicePool.adjustUsed = false;
    this.dicePool.rerollUsed = false;
    this.targetMode = null;
    this.addLog(`\u2014 Turn ${this.turn} \u2014`);

    // Roll dice — base 4 + extra from equipment
    const extraDice = this.getExtraDiceCount();
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

    // Dice passives trigger on rolled values
    this.processDicePassives();

    this.update();
  }

  processDicePassives() {
    const hasMedicus = this.party.some(u => u.classId === 'medicus' && !u.downed);
    const hasSagittarius = this.party.some(u => u.classId === 'sagittarius' && !u.downed);

    for (const die of this.dicePool.dice) {
      // Medicus: heal random damaged ally on each 1
      if (die.value === 1 && hasMedicus) {
        const damaged = this.party.filter(u => !u.downed && u.hp < u.maxHp);
        if (damaged.length > 0) {
          const target = damaged[Math.floor(Math.random() * damaged.length)];
          const healAmt = 2;
          target.hp = Math.min(target.maxHp, target.hp + healAmt);
          this.addLog(`Healer's Instinct: ${target.name} healed ${healAmt} HP.`);
          if (this.onVisual) this.onVisual('unitHeal', { unitIndex: target.index, amount: healAmt });
        }
      }

      // Sagittarius: damage random enemy on each 6
      if (die.value === 6 && hasSagittarius) {
        const alive = this.enemies.filter(e => !e.dead);
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          const dmg = 2;
          target.hp = Math.max(0, target.hp - dmg);
          this.addLog(`Eagle Eye: ${target.name} takes ${dmg} damage.`);
        }
      }
    }

    // Check if any enemy died from Sagittarius passive
    this.checkEnemyDeaths();
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
      this.triggerVictory();
    }
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
      case 'range':
        return available.some(d => d.value >= cost.min && d.value <= cost.max);
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
      case 'threshold': {
        const validT = available.filter(d => d.value >= cost.min).sort((a, b) => a.value - b.value);
        return validT.length > 0 ? [validT[0].id] : [];
      }
      case 'range': {
        const validR = available.filter(d => d.value >= cost.min && d.value <= cost.max).sort((a, b) => a.value - b.value);
        return validR.length > 0 ? [validR[0].id] : [];
      }
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
      let total = result.damage + bonusDmg;
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
      // Special: Marsh Fang — healing clears 1 poison from target
      if (this.unitHasItem(unit, 'marsh_fang') && result.target.poison > 0) {
        result.target.poison = Math.max(0, result.target.poison - 1);
        parts.push('Marsh Fang purges 1 poison.');
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
      if (this.onVisual) this.onVisual('unitBlock', { unitIndex: result.target.index, amount: totalBlock });
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
      const count = this.party.filter(u => !u.downed).length;
      this.party.forEach(u => {
        if (!u.downed) {
          u.block = (u.block || 0) + totalBlock;
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: totalBlock });
        }
      });
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
    // Poison (single target)
    if (result.poison && result.target) {
      const totalPoison = result.poison + (unit.equipPoison || 0);
      result.target.poison = (result.target.poison || 0) + totalPoison;
      const bonusStr = unit.equipPoison > 0 ? ` (${result.poison}+${unit.equipPoison})` : '';
      parts.push(`Applies ${totalPoison}${bonusStr} Poison.`);
    }
    // Poison splash: apply to all other enemies
    if (result.poisonSplash && result.target) {
      const splashPoison = result.poisonSplash;
      this.enemies.forEach(e => {
        if (!e.dead && e !== result.target) e.poison = (e.poison || 0) + splashPoison;
      });
      parts.push(`${splashPoison} Poison splashes to other enemies.`);
    }
    // Poison all enemies
    if (result.poisonAll) {
      const totalPoison = result.poisonAll + (unit.equipPoison || 0);
      this.enemies.forEach(e => {
        if (!e.dead) e.poison = (e.poison || 0) + totalPoison;
      });
      parts.push(`${unit.name} uses ${skill.name} \u2014 applies ${totalPoison} Poison to all enemies.`);
    }
    // Damage all enemies (AoE)
    if (result.damageAll) {
      const aoeDmg = result.damageAll + bonusDmg;
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
      const totalHeal = result.healAll + bonusHeal;
      this.party.forEach(u => {
        if (!u.downed) {
          const before = u.hp;
          u.hp = Math.min(u.maxHp, u.hp + totalHeal);
          unit.stats.healingDone += u.hp - before;
        }
      });
      const bonusStr = bonusHeal > 0 ? ` (${result.healAll}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals all allies for ${totalHeal}${bonusStr} HP.`);
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
    if (parts.length === 0) parts.push(`${unit.name} uses ${skill.name}.`);
    return parts.join(' ');
  }

  triggerVictory() {
    this.phase = PHASE.VICTORY;
    this.morale = Math.min(100, this.morale + 7);
    this.addLog('All enemies defeated! (+7 Morale)');
    if (this.onVisual) this.onVisual('morale', { amount: 7 });
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
    // Clear enemy block at start of their turn
    this.enemies.forEach(e => { if (!e.dead) e.block = 0; });
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
    if (enemy.dead) {
      // Skip dead enemies (could have died to another enemy's death effect)
      setTimeout(() => this.executeEnemySequence(enemies, index + 1), 100);
      return;
    }
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
    // Structures (Wicker Man) don't take actions — their damage is passive via turnDamageAll
    if (enemy.isStructure) {
      this.addLog(`${enemy.name} ${enemy.actions[0].text}.`);
      return;
    }

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
      // Curse: Hunter's Shadow — enemies deal +1 damage
      const curseBonusDmg = this.getActiveCurses().includes('hunters_shadow') ? 1 : 0;
      let dmg = action.damage + curseBonusDmg;
      // Ballistarius passive: Pinning Fire — pinned enemies deal 15% less
      if (enemy._pinned) {
        const reduction = Math.max(1, Math.floor(dmg * 0.15));
        dmg = Math.max(1, dmg - reduction);
        enemy._pinned = false;
      }
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
      const totalActionDmg = action.damage + curseBonusDmg;
      this.addLog(`${enemy.name} ${action.text} at ${target.name} for ${totalActionDmg} damage${dmg < totalActionDmg ? ` (${dmg} after block)` : ''}.`);

      if (this.onVisual) {
        this.onVisual('unitHit', { unitIndex: target.index, damage: dmg });
      }
    }

    // Enemy poison on target
    if (action.poisonTarget && target) {
      target.poison = (target.poison || 0) + action.poisonTarget;
      this.addLog(`${target.name} is poisoned! (+${action.poisonTarget} Poison)`);
    }

    if (action.morale) {
      let moraleDelta = action.morale;
      // Cornicen passive: Demoralizing Horn — enemy morale attacks deal 3 less morale damage
      if (moraleDelta < 0 && this.party.some(u => !u.downed && u.classId === 'cornicen')) {
        moraleDelta = Math.min(0, moraleDelta + 3);
      }
      this.morale = Math.max(-100, Math.min(100, this.morale + moraleDelta));
      this.addLog(`${enemy.name} ${action.text}! Morale ${moraleDelta > 0 ? '+' : ''}${moraleDelta}.`);
      if (this.onVisual) {
        this.onVisual('morale', { amount: moraleDelta });
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

    // Shieldbearer: grant block to all other enemies
    if (action.blockAllEnemies) {
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + action.blockAllEnemies;
        }
      });
      this.addLog(`${enemy.name} ${action.text}. All enemies gain ${action.blockAllEnemies} Block.`);
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
          const scaledMaxHp = Math.round(data.maxHp * (1 + diffBonus * 0.55));
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
        // Praetorian passive: Unyielding — survive one lethal hit per encounter
        if (u.classId === 'praetorian' && !u._unyieldingUsed) {
          u._unyieldingUsed = true;
          u.hp = 1;
          this.addLog(`${u.name} refuses to fall! (Unyielding)`);
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

  // Grant one skill pick after each combat encounter (always grants — HP if maxed)
  grantSkillPick() {
    const hasAnyUse = this.party.some(u => !u.downed);
    if (hasAnyUse) {
      this.pendingSkillPicks++;
    }
  }

  // --- Equipment helpers ---
  unitHasItem(unit, itemId) {
    for (const slot of ['weapon', 'armor', 'trinket']) {
      if (unit.equipment[slot].includes(itemId)) return true;
    }
    return false;
  }

  partyHasItem(itemId) {
    return this.party.some(u => !u.downed && this.unitHasItem(u, itemId));
  }

  computeEquipmentStats(unit) {
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
        // Signifer passive: +1 extra die
        if (u.classId === 'signifer') extra += 1;
      }
    });
    return extra;
  }

  // Cornicen passive: can reroll 1 die per turn (never same value)
  canRerollDie() {
    if (this.dicePool.rerollUsed) return false;
    return this.party.some(u => u.classId === 'cornicen' && !u.downed);
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
    this.dicePool.rerollUsed = true;
    this.addLog(`Cornicen rerolls die: ${oldVal} → ${newVal}`);
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
      const rarityOrder = { common: 0, uncommon: 1, rare: 2 };
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
