// ============================================================
// Last Cohort – UI Renderer
// ============================================================

class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.selectedUnitIndex = 0; // default to first unit
    this.stagedSkill = null;    // { skillId, diceIds[] } — skill clicked once, dice highlighted
    this.prevEnemyHp = {};
    this.prevUnitHp = {};
    this.logOpen = false;
    this.diceRevealed = 0;
    this.diceRevealRunning = false;
    this.init();
  }

  init() {
    this.engine.onUpdate = () => this.render();
    this.engine.onVisual = (type, data) => this.handleVisual(type, data);
  }

  handleVisual(type, data) {
    switch (type) {
      case 'enemyAttack':
        this.flashElement(`enemy-${data.enemyIndex}`, 'attacking', 500);
        break;
      case 'unitHit':
        this.flashElement(`unit-${data.unitIndex}`, 'hit', 500);
        this.showDamagePopup(`unit-${data.unitIndex}`, data.damage, 'damage');
        break;
      case 'unitHeal':
        this.flashElement(`unit-${data.unitIndex}`, 'healed', 600);
        this.showDamagePopup(`unit-${data.unitIndex}`, data.amount, 'heal');
        break;
      case 'morale':
        this.showDamagePopup('morale-bar', data.amount, 'morale');
        break;
    }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // --- Main render ---
  render() {
    this.renderMorale();
    this.renderEnemies();
    this.renderDicePool();
    this.renderParty();
    this.renderPhaseUI();
    this.renderSkillPanel();
  }

  // --- Auto-select first alive unit if none selected ---
  ensureUnitSelected() {
    if (this.selectedUnitIndex !== null) {
      const u = this.engine.party[this.selectedUnitIndex];
      if (u && !u.downed && !u.actedThisTurn) return;
    }
    // Find first alive, non-acted unit
    const idx = this.engine.party.findIndex(u => !u.downed && !u.actedThisTurn);
    this.selectedUnitIndex = idx >= 0 ? idx : this.engine.party.findIndex(u => !u.downed);
  }

  // --- Morale ---
  renderMorale() {
    const band = getMoraleBand(this.engine.morale);
    const label = document.getElementById('morale-label');
    const fill = document.getElementById('morale-fill');
    label.textContent = `${band.label} (${this.engine.morale})`;
    label.style.color = band.color;
    const pct = (this.engine.morale + 100) / 200 * 100;
    fill.style.width = pct + '%';
    fill.style.background = band.color;
  }

  // --- Enemies ---
  renderEnemies() {
    const frontSlots = document.querySelector('#enemy-row-front .enemy-slots');
    const backSlots = document.querySelector('#enemy-row-back .enemy-slots');
    frontSlots.innerHTML = '';
    backSlots.innerHTML = '';

    this.engine.enemies.forEach((enemy, i) => {
      const el = document.createElement('div');
      el.className = `enemy-card${enemy.dead ? ' dead' : ''}${this.isEnemyTargetable(enemy) ? ' targetable' : ''}${enemy.justSpawned ? ' spawning' : ''}`;
      el.id = `enemy-${i}`;

      const hpPct = (enemy.hp / enemy.maxHp) * 100;
      const prevHp = this.prevEnemyHp[i] !== undefined ? this.prevEnemyHp[i] : enemy.hp;
      const drainPct = (prevHp / enemy.maxHp) * 100;
      this.prevEnemyHp[i] = enemy.hp;

      el.innerHTML = `
        <div class="enemy-name">${enemy.name}</div>
        <div class="hp-bar">
          <div class="hp-drain" style="width:${drainPct}%"></div>
          <div class="hp-fill" style="width:${hpPct}%"></div>
        </div>
        <div class="hp-text">${enemy.hp}/${enemy.maxHp}</div>
      `;

      if (drainPct > hpPct) {
        requestAnimationFrame(() => {
          const drain = el.querySelector('.hp-drain');
          if (drain) drain.style.width = hpPct + '%';
        });
      }

      if (this.isEnemyTargetable(enemy)) {
        el.addEventListener('click', () => this.onEnemyClick(enemy));
      }

      (enemy.row === 'front' ? frontSlots : backSlots).appendChild(el);
    });

    const backExists = this.engine.enemies.some(e => e.row === 'back');
    document.getElementById('enemy-row-back').classList.toggle('hidden', !backExists);
  }

  isEnemyTargetable(enemy) {
    if (enemy.dead) return false;
    // Old targeting mode (from engine)
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'enemy') {
      return this.engine.getValidEnemyTargets(this.engine.targetMode.skill).includes(enemy);
    }
    // New: staged skill targeting
    if (this.stagedSkill && this.selectedUnitIndex !== null) {
      const unit = this.engine.party[this.selectedUnitIndex];
      if (!unit) return false;
      const skill = unit.skills.find(s => s.id === this.stagedSkill.skillId);
      if (!skill || skill.target !== TARGET.SINGLE_ENEMY) return false;
      const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
      if (!canPay) return false;
      return this.engine.getValidEnemyTargets(skill).includes(enemy);
    }
    return false;
  }

  onEnemyClick(enemy) {
    // Staged skill — click to confirm on this target
    if (this.stagedSkill) {
      this.onStagedTarget(enemy);
      return;
    }
    // Old engine targeting
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'enemy') {
      this.engine.selectTarget(enemy);
    }
  }

  isAllyTargetable(unit) {
    if (unit.downed) return false;
    // Old targeting mode
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'ally') return true;
    // Staged skill targeting
    if (this.stagedSkill && this.selectedUnitIndex !== null) {
      const caster = this.engine.party[this.selectedUnitIndex];
      if (!caster) return false;
      const skill = caster.skills.find(s => s.id === this.stagedSkill.skillId);
      if (!skill || skill.target !== TARGET.SINGLE_ALLY) return false;
      const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
      return canPay;
    }
    return false;
  }

  // --- Dice Pool ---
  renderDicePool() {
    const pool = document.getElementById('dice-pool');
    pool.innerHTML = '';

    // Remove old hints
    document.querySelectorAll('.dice-hint').forEach(h => h.remove());

    if (this.engine.phase === PHASE.PRE_COMBAT || this.engine.phase === PHASE.SPAWNING) {
      for (let i = 0; i < this.engine.dicePool.count; i++) {
        const el = document.createElement('div');
        el.className = 'die empty';
        el.textContent = '?';
        pool.appendChild(el);
      }
      return;
    }

    // Rolling phase: reveal dice one by one
    if (this.engine.phase === PHASE.ROLLING) {
      this.engine.dicePool.dice.forEach((die, i) => {
        const el = document.createElement('div');
        if (i < this.diceRevealed) {
          el.className = 'die roll-in';
          el.textContent = die.value;
        } else {
          el.className = 'die empty';
          el.textContent = '?';
        }
        pool.appendChild(el);
      });
      return;
    }

    // Player turn: show all dice with staged highlighting
    const stagedDiceIds = this.stagedSkill ? this.stagedSkill.diceIds : [];

    this.engine.dicePool.dice.forEach(die => {
      const isStaged = stagedDiceIds.includes(die.id);
      const el = document.createElement('div');
      el.className = `die${die.used ? ' used' : ''}${isStaged ? ' selected' : ''}`;
      el.textContent = die.value;
      el.dataset.dieId = die.id;

      if (!die.used && this.engine.phase === PHASE.PLAYER_TURN && this.stagedSkill) {
        // In staged mode: click dice to swap them in/out of the staged set
        el.addEventListener('click', () => this.onDieClickStaged(die));
      }

      // Centurion adjust buttons
      if (!die.used && this.engine.canAdjustDie() && this.engine.phase === PHASE.PLAYER_TURN && !this.stagedSkill) {
        const adjustContainer = document.createElement('div');
        adjustContainer.className = 'die-adjust';
        if (die.value < 6) {
          const up = document.createElement('button');
          up.className = 'adjust-btn';
          up.textContent = '+';
          up.addEventListener('click', (e) => { e.stopPropagation(); this.engine.adjustDie(die.id, 1); });
          adjustContainer.appendChild(up);
        }
        if (die.value > 1) {
          const down = document.createElement('button');
          down.className = 'adjust-btn';
          down.textContent = '-';
          down.addEventListener('click', (e) => { e.stopPropagation(); this.engine.adjustDie(die.id, -1); });
          adjustContainer.appendChild(down);
        }
        el.appendChild(adjustContainer);
      }

      pool.appendChild(el);
    });

    // Show staged dice hint
    if (stagedDiceIds.length > 0) {
      const hint = document.createElement('div');
      hint.className = 'dice-hint';
      const sum = stagedDiceIds.reduce((s, id) => {
        const d = this.engine.dicePool.dice.find(x => x.id === id);
        return s + (d ? d.value : 0);
      }, 0);
      const skill = this.stagedSkill ? this.engine.party[this.selectedUnitIndex].skills.find(s => s.id === this.stagedSkill.skillId) : null;
      hint.textContent = skill ? `${skill.name}: ${stagedDiceIds.length} dice (sum: ${sum}) — tap skill to confirm` : '';
      pool.parentElement.insertBefore(hint, pool.nextSibling);
    }
  }

  onDieClickStaged(die) {
    if (!this.stagedSkill || die.used) return;
    const idx = this.stagedSkill.diceIds.indexOf(die.id);
    const skill = this.engine.party[this.selectedUnitIndex].skills.find(s => s.id === this.stagedSkill.skillId);
    const neededDice = skill.cost.dice;

    if (idx >= 0) {
      // Deselect this die
      this.stagedSkill.diceIds.splice(idx, 1);
    } else {
      // If at capacity, remove oldest and add new
      if (this.stagedSkill.diceIds.length >= neededDice) {
        this.stagedSkill.diceIds.shift();
      }
      this.stagedSkill.diceIds.push(die.id);
    }
    this.render();
  }

  // Dice reveal animation for rolling phase — updates dice DOM only, no full render
  startDiceReveal() {
    this.diceRevealed = 0;
    this.renderDicePool();
    const revealNext = () => {
      if (this.diceRevealed >= this.engine.dicePool.count) {
        this.diceRevealRunning = false;
        this.diceRevealed = 0;
        setTimeout(() => this.engine.onDiceRevealed(), 200);
        return;
      }
      this.diceRevealed++;
      this.renderDicePool();
      setTimeout(revealNext, 120);
    };
    setTimeout(revealNext, 300);
  }

  // --- Party ---
  renderParty() {
    const area = document.getElementById('party-area');
    area.innerHTML = '';

    this.engine.party.forEach((unit, i) => {
      const el = document.createElement('div');
      const isTargetable = this.isAllyTargetable(unit);
      const isSelected = this.selectedUnitIndex === i;
      el.className = `unit-card${unit.downed ? ' downed' : ''}${isSelected ? ' selected' : ''}${isTargetable ? ' targetable' : ''}${unit.actedThisTurn ? ' acted' : ''}`;
      el.id = `unit-${i}`;

      const hpPct = (unit.hp / unit.maxHp) * 100;
      const prevHp = this.prevUnitHp[i] !== undefined ? this.prevUnitHp[i] : unit.hp;
      const drainPct = (prevHp / unit.maxHp) * 100;
      this.prevUnitHp[i] = unit.hp;

      el.innerHTML = `
        <div class="unit-header">
          <span class="unit-title">${unit.title}</span>
          <span class="unit-name">${unit.name}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-drain" style="width:${drainPct}%"></div>
          <div class="hp-fill ${hpPct < 30 ? 'critical' : ''}" style="width:${hpPct}%"></div>
        </div>
        <div class="unit-stats">
          <span class="hp-text">${unit.hp}/${unit.maxHp}</span>
          ${unit.block > 0 ? `<span class="block-text">Block: ${unit.block}</span>` : ''}
          ${unit.downed ? '<span class="downed-text">DOWNED</span>' : ''}
          ${unit.actedThisTurn && !unit.downed ? '<span class="acted-text">DONE</span>' : ''}
        </div>
      `;

      if (drainPct > hpPct) {
        requestAnimationFrame(() => {
          const drain = el.querySelector('.hp-drain');
          if (drain) drain.style.width = hpPct + '%';
        });
      }

      if (this.engine.phase === PHASE.PLAYER_TURN) {
        if (isTargetable) {
          el.addEventListener('click', () => {
            if (this.stagedSkill) {
              this.onStagedTarget(unit);
            } else if (this.engine.targetMode) {
              this.engine.selectTarget(unit);
            }
          });
        } else if (!unit.downed) {
          el.addEventListener('click', () => this.onUnitClick(i));
        }
      }

      area.appendChild(el);
    });
  }

  onUnitClick(unitIndex) {
    if (this.engine.targetMode) return;
    this.selectedUnitIndex = unitIndex;
    this.stagedSkill = null; // clear staged skill when switching units
    this.render();
  }

  // --- Skill Panel ---
  renderSkillPanel() {
    const panel = document.getElementById('skill-panel');
    const list = document.getElementById('skill-list');
    const nameEl = document.getElementById('skill-unit-name');
    const confirmBtn = document.getElementById('btn-confirm');
    const endBtn = document.getElementById('btn-end-turn');

    // End turn button — visible during player turn (not targeting)
    if (this.engine.phase === PHASE.PLAYER_TURN && !this.engine.targetMode) {
      endBtn.classList.remove('hidden');
      endBtn.textContent = 'End Turn';
      endBtn.onclick = () => { this.stagedSkill = null; this.engine.endPlayerTurn(); };
    } else if (this.engine.phase === PHASE.PLAYER_TURN && this.engine.targetMode) {
      endBtn.classList.remove('hidden');
      endBtn.textContent = 'Cancel';
      endBtn.onclick = () => { this.engine.cancelTarget(); this.stagedSkill = null; this.render(); };
    } else if (this.engine.phase === PHASE.VICTORY) {
      endBtn.classList.remove('hidden');
      endBtn.textContent = 'Continue';
      endBtn.onclick = () => this.onVictory();
    } else if (this.engine.phase === PHASE.DEFEAT) {
      endBtn.classList.remove('hidden');
      endBtn.textContent = 'Fall';
      endBtn.onclick = () => this.onDefeat();
    } else {
      endBtn.classList.add('hidden');
      endBtn.textContent = 'End Turn';
    }

    if (this.engine.phase !== PHASE.PLAYER_TURN) {
      panel.classList.add('hidden');
      confirmBtn.classList.add('hidden');
      return;
    }

    this.ensureUnitSelected();

    if (this.selectedUnitIndex === null || this.selectedUnitIndex < 0) {
      panel.classList.add('hidden');
      confirmBtn.classList.add('hidden');
      return;
    }

    const unit = this.engine.party[this.selectedUnitIndex];
    if (!unit || unit.downed) {
      panel.classList.add('hidden');
      confirmBtn.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');

    if (unit.actedThisTurn) {
      nameEl.textContent = `${unit.name} — Done`;
      list.innerHTML = '<div class="skill-acted-msg">This unit has already acted this turn.</div>';
      confirmBtn.classList.add('hidden');
      return;
    }

    nameEl.textContent = `${unit.name}`;
    list.innerHTML = '';

    const skills = this.engine.getValidSkills(this.selectedUnitIndex);

    skills.forEach(skill => {
      const el = document.createElement('div');
      const isStaged = this.stagedSkill && this.stagedSkill.skillId === skill.id;

      el.className = `skill-btn${skill.canUse ? '' : ' disabled'}${isStaged ? ' staged' : ''}`;

      el.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span></div>
        <div class="skill-desc">${skill.description}</div>
      `;

      if (skill.canUse) {
        el.addEventListener('click', () => this.onSkillClick(skill));
      }

      list.appendChild(el);
    });

    confirmBtn.classList.add('hidden');
  }

  onSkillClick(skill) {
    if (this.stagedSkill && this.stagedSkill.skillId === skill.id) {
      // Clicking same skill again — unstage
      this.stagedSkill = null;
      this.render();
      return;
    }

    // Stage this skill with auto-picked dice
    const autoDice = this.engine.autoPick(skill);
    this.stagedSkill = { skillId: skill.id, diceIds: autoDice };

    // For self/all-target skills, execute immediately (no target to click)
    const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
    if (canPay && (skill.target === TARGET.SELF || skill.target === TARGET.ALL_ALLIES || skill.target === TARGET.ALL_ENEMIES)) {
      const diceIds = [...this.stagedSkill.diceIds];
      this.stagedSkill = null;
      this.engine.beginSkillTarget(this.selectedUnitIndex, skill.id, diceIds);
      this.autoAdvanceUnit();
      return;
    }

    // For targeted skills, render so enemies/allies light up
    this.render();
  }

  // Called when player clicks a targetable enemy/ally while a skill is staged
  onStagedTarget(target) {
    if (!this.stagedSkill) return;
    const unit = this.engine.party[this.selectedUnitIndex];
    const skill = unit.skills.find(s => s.id === this.stagedSkill.skillId);
    if (!skill) return;

    const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
    if (!canPay) return;

    const diceIds = [...this.stagedSkill.diceIds];
    const unitIndex = this.selectedUnitIndex;
    this.stagedSkill = null;
    this.engine.executeSkill(unitIndex, skill.id, diceIds, [target]);
    this.autoAdvanceUnit();
  }

  autoAdvanceUnit() {
    const next = this.engine.party.findIndex(u => !u.downed && !u.actedThisTurn);
    if (next >= 0) {
      this.selectedUnitIndex = next;
    }
  }

  // --- Phase UI ---
  renderPhaseUI() {
    const phaseLabel = document.getElementById('phase-label');
    const rollBtn = document.getElementById('btn-roll');
    const logToggle = document.getElementById('btn-log-toggle');

    rollBtn.classList.add('hidden');

    switch (this.engine.phase) {
      case PHASE.PRE_COMBAT:
        phaseLabel.textContent = 'ENCOUNTER';
        rollBtn.classList.remove('hidden');
        rollBtn.textContent = 'Begin Encounter';
        rollBtn.onclick = () => { this.engine.beginSpawning(); };
        break;
      case PHASE.SPAWNING:
        phaseLabel.textContent = 'ENEMIES APPEAR...';
        break;
      case PHASE.ROLLING:
        phaseLabel.textContent = `TURN ${this.engine.turn}`;
        if (!this.diceRevealRunning) {
          this.diceRevealRunning = true;
          setTimeout(() => this.startDiceReveal(), 50);
        }
        break;
      case PHASE.PLAYER_TURN:
        if (this.engine.targetMode) {
          phaseLabel.textContent = `SELECT TARGET FOR ${this.engine.targetMode.skill.name.toUpperCase()}`;
        } else {
          phaseLabel.textContent = `TURN ${this.engine.turn}`;
        }
        break;
      case PHASE.ENEMY_TURN:
        phaseLabel.textContent = 'ENEMY TURN';
        break;
      case PHASE.VICTORY:
        phaseLabel.textContent = 'VICTORY';
        break;
      case PHASE.DEFEAT:
        phaseLabel.textContent = 'DEFEAT';
        break;
    }

    logToggle.onclick = () => this.toggleLog();
  }

  // --- Combat Log (toggle) ---
  toggleLog() {
    this.logOpen = !this.logOpen;
    const logEl = document.getElementById('combat-log');
    logEl.classList.toggle('open', this.logOpen);
    if (this.logOpen) {
      this.renderLog();
    }
  }

  renderLog() {
    const content = document.getElementById('log-content');
    content.innerHTML = this.engine.log.map(l => `<div class="log-line">${l}</div>`).join('');
    content.scrollTop = content.scrollHeight;
  }

  // --- Visual effects ---
  showDamagePopup(elementId, amount, type = 'damage') {
    const target = document.getElementById(elementId);
    if (!target) return;

    const popup = document.createElement('div');
    popup.className = `damage-popup${type === 'heal' ? ' heal' : ''}${type === 'morale' ? ' morale' : ''}`;
    if (type === 'damage') {
      popup.textContent = `-${amount}`;
    } else if (type === 'heal') {
      popup.textContent = `+${amount}`;
    } else if (type === 'morale') {
      popup.textContent = amount > 0 ? `+${amount}` : `${amount}`;
    }

    const rect = target.getBoundingClientRect();
    popup.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    popup.style.top = (rect.top) + 'px';
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
  }

  flashElement(elementId, cssClass, duration = 500) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add(cssClass);
    setTimeout(() => el.classList.remove(cssClass), duration);
  }

  // --- Post-encounter ---
  onVictory() {
    const isFinal = this.engine.encounterIndex + 1 >= ENCOUNTERS.length;
    const title = isFinal ? 'SURVIVED' : 'ENCOUNTER WON';
    const text = isFinal
      ? 'Your cohort escapes the Teutoburg Forest... for now.'
      : 'The enemy falls. You press deeper into the forest.';

    this.showSummary(title, text, isFinal);
  }

  onDefeat() {
    this.showSummary(
      'THE COHORT FALLS',
      'The forest claims another Roman detachment. None will know where they fell.',
      true
    );
  }

  showSummary(title, text, isFinal) {
    this.showScreen('summary-screen');
    document.getElementById('summary-title').textContent = title;
    document.getElementById('summary-text').textContent = text;

    const statsEl = document.getElementById('summary-stats');
    statsEl.innerHTML = this.engine.party.map(u => {
      const s = u.stats;
      const statLines = [];
      if (s.damageDealt > 0) statLines.push(`<span class="stat-dmg">${s.damageDealt} damage dealt</span>`);
      if (s.healingDone > 0) statLines.push(`<span class="stat-heal">${s.healingDone} healing done</span>`);
      if (s.blockGenerated > 0) statLines.push(`<span class="stat-block">${s.blockGenerated} block generated</span>`);
      if (s.moraleRestored > 0) statLines.push(`<span class="stat-morale">${s.moraleRestored} morale restored</span>`);
      if (s.damageTaken > 0) statLines.push(`<span class="stat-taken">${s.damageTaken} damage taken</span>`);

      return `
        <div class="summary-unit ${u.downed ? 'downed' : ''}">
          <div class="summary-unit-header">
            <span class="summary-unit-title">${u.title}</span>
            <span class="summary-unit-name">${u.name}</span>
            <span class="summary-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp}`}</span>
          </div>
          <div class="summary-unit-stats">
            ${statLines.length > 0 ? statLines.join('  ') : '<span class="stat-none">No contribution</span>'}
          </div>
        </div>`;
    }).join('');

    const continueBtn = document.getElementById('btn-summary-continue');
    if (title === 'THE COHORT FALLS') {
      continueBtn.textContent = 'New March';
      continueBtn.onclick = () => window.game.startNewRun();
    } else {
      continueBtn.textContent = 'Continue';
      continueBtn.onclick = () => this.showLootScreen(isFinal);
    }
  }

  showLootScreen(isFinal) {
    this.engine.afterEncounter();
    this.engine.encounterIndex++;

    // Roll drops from killed enemies
    this.pendingLoot = [];
    for (const enemyId of this.engine.killedEnemies) {
      const itemId = rollDrop(enemyId);
      if (itemId) this.pendingLoot.push(itemId);
    }

    this.lootScreenFinal = isFinal;
    this.showScreen('loot-screen');
    this.renderLootScreen();
  }

  renderLootScreen() {
    const lootText = document.getElementById('loot-text');
    const dropsEl = document.getElementById('loot-drops');
    const equipListEl = document.getElementById('loot-equip-list');
    const continueBtn = document.getElementById('btn-loot-continue');

    dropsEl.innerHTML = '';

    if (this.pendingLoot.length === 0) {
      lootText.textContent = 'Nothing of value was found among the fallen.';
    } else {
      lootText.textContent = 'Your soldiers scavenge what they can.';

      this.pendingLoot.forEach((itemId, lootIdx) => {
        const item = getItemData(itemId);
        if (!item) return;

        const card = document.createElement('div');
        card.className = `loot-card rarity-${item.rarity}`;

        // Which units can equip this?
        const eligible = this.engine.party.filter(u => !u.downed && item.equippableBy.includes(u.classId));

        const equipBtns = eligible.map(u => {
          const existing = u.equipment[item.slot];
          const existingItem = existing ? getItemData(existing) : null;
          const replaceText = existingItem ? `Replaces: ${existingItem.name}` : '';
          return `<button class="loot-equip-btn" data-loot="${lootIdx}" data-unit="${u.index}">
            Equip ${u.title}${replaceText ? `<span class="loot-replace">${replaceText}</span>` : ''}
          </button>`;
        }).join('');

        card.innerHTML = `
          <div class="loot-card-header">
            <span class="loot-item-name">${item.name}</span>
            <span class="loot-rarity">${item.rarity.toUpperCase()}</span>
          </div>
          <div class="loot-item-meta">${item.slot} &middot; ${formatItemStats(item.stats)}</div>
          <div class="loot-item-desc">${item.description}</div>
          <div class="loot-equip-actions">${equipBtns}</div>
        `;

        // Bind equip buttons
        card.querySelectorAll('.loot-equip-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const li = parseInt(btn.dataset.loot);
            const ui = parseInt(btn.dataset.unit);
            this.equipLootItem(li, ui);
          });
        });

        dropsEl.appendChild(card);
      });
    }

    // Current equipment summary
    equipListEl.innerHTML = this.engine.party.map(u => {
      const slots = ['weapon', 'armor', 'trinket'].map(slot => {
        const itemId = u.equipment[slot];
        const item = itemId ? getItemData(itemId) : null;
        return `<span class="equip-slot">
          <span class="equip-slot-label">${slot}</span>
          <span class="equip-slot-item ${item ? 'rarity-' + item.rarity : 'empty'}">${item ? item.name : '—'}</span>
        </span>`;
      }).join('');
      return `<div class="equip-unit">
        <span class="equip-unit-name">${u.title} ${u.name}</span>
        <div class="equip-slots">${slots}</div>
      </div>`;
    }).join('');

    if (this.lootScreenFinal) {
      continueBtn.textContent = 'New March';
      continueBtn.onclick = () => window.game.startNewRun();
    } else {
      continueBtn.textContent = 'Continue March';
      continueBtn.onclick = () => window.game.startNextEncounter();
    }
  }

  equipLootItem(lootIndex, unitIndex) {
    const itemId = this.pendingLoot[lootIndex];
    if (!itemId) return;
    const success = this.engine.equipItem(unitIndex, itemId);
    if (success) {
      // Remove from pending loot
      this.pendingLoot.splice(lootIndex, 1);
      this.renderLootScreen();
    }
  }

  showResult(title, text, isFinal) {
    this.showScreen('result-screen');
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-text').textContent = text;

    const statusEl = document.getElementById('result-party-status');
    statusEl.innerHTML = this.engine.party.map(u =>
      `<div class="result-unit ${u.downed ? 'downed' : ''}">
        ${u.name}: ${u.downed ? 'Fallen' : `${u.hp}/${u.maxHp} HP`}
      </div>`
    ).join('');

    const nextBtn = document.getElementById('btn-next');
    nextBtn.textContent = 'New March';
    nextBtn.onclick = () => window.game.startNewRun();
  }
}
