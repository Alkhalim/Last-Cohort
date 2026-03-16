// ============================================================
// Last Cohort – UI Renderer
// ============================================================

class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.selectedDice = []; // array of die IDs for multi-select
    this.selectedUnitIndex = null;
    // Track previous HP for drain animation
    this.prevEnemyHp = {};
    this.prevUnitHp = {};
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
      case 'morale':
        // Show morale change on the morale bar
        this.showDamagePopup('morale-bar', data.amount, 'morale');
        break;
    }
  }

  // --- Screen management ---
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
    this.renderLog();
    this.renderSkillPanel();
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

      // Animate drain layer to match current HP after brief delay
      if (drainPct > hpPct) {
        requestAnimationFrame(() => {
          const drain = el.querySelector('.hp-drain');
          if (drain) drain.style.width = hpPct + '%';
        });
      }

      if (this.isEnemyTargetable(enemy)) {
        el.addEventListener('click', () => this.onEnemyClick(enemy));
      }

      if (enemy.row === 'front') {
        frontSlots.appendChild(el);
      } else {
        backSlots.appendChild(el);
      }
    });

    // Hide back row if no back-row enemies exist (alive or dead)
    const backExists = this.engine.enemies.some(e => e.row === 'back');
    document.getElementById('enemy-row-back').classList.toggle('hidden', !backExists);
  }

  isEnemyTargetable(enemy) {
    return this.engine.targetMode && this.engine.targetMode.targetType === 'enemy' && !enemy.dead &&
      this.engine.getValidEnemyTargets(this.engine.targetMode.skill).includes(enemy);
  }

  onEnemyClick(enemy) {
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'enemy') {
      this.engine.selectTarget(enemy);
    }
  }

  // --- Dice Pool ---
  renderDicePool() {
    const pool = document.getElementById('dice-pool');
    pool.innerHTML = '';

    if (this.engine.phase === PHASE.ROLL || this.engine.phase === PHASE.PRE_COMBAT || this.engine.phase === PHASE.SPAWNING) {
      for (let i = 0; i < 5; i++) {
        const el = document.createElement('div');
        el.className = 'die empty';
        el.textContent = '?';
        pool.appendChild(el);
      }
      return;
    }

    this.engine.dicePool.dice.forEach(die => {
      const isSelected = this.selectedDice.includes(die.id);
      const el = document.createElement('div');
      el.className = `die${die.used ? ' used' : ''}${isSelected ? ' selected' : ''}`;
      el.textContent = die.value;
      el.dataset.dieId = die.id;

      // Show selection order badge for multi-select
      if (isSelected && this.selectedDice.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'die-badge';
        badge.textContent = this.selectedDice.indexOf(die.id) + 1;
        el.appendChild(badge);
      }

      if (!die.used && this.engine.phase === PHASE.PLAYER_TURN) {
        el.addEventListener('click', () => this.onDieClick(die));
      }

      // Adjust buttons for Centurion passive
      if (!die.used && this.engine.canAdjustDie() && this.engine.phase === PHASE.PLAYER_TURN) {
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

    // Show selected dice count hint
    if (this.selectedDice.length > 0) {
      const hint = document.createElement('div');
      hint.className = 'dice-hint';
      const sum = this.selectedDice.reduce((s, id) => {
        const d = this.engine.dicePool.dice.find(x => x.id === id);
        return s + (d ? d.value : 0);
      }, 0);
      hint.textContent = `${this.selectedDice.length} dice selected (sum: ${sum})`;
      pool.parentElement.insertBefore(hint, pool.nextSibling);
    }
    // Remove old hints
    const oldHint = document.querySelector('.dice-hint');
    if (oldHint && this.selectedDice.length === 0) oldHint.remove();
  }

  onDieClick(die) {
    if (die.used) return;
    const idx = this.selectedDice.indexOf(die.id);
    if (idx >= 0) {
      // Deselect
      this.selectedDice.splice(idx, 1);
    } else {
      // Select (add to selection)
      this.selectedDice.push(die.id);
    }
    this.render();
  }

  clearDiceSelection() {
    this.selectedDice = [];
    // Remove hint if present
    const hint = document.querySelector('.dice-hint');
    if (hint) hint.remove();
  }

  // --- Party ---
  renderParty() {
    const area = document.getElementById('party-area');
    area.innerHTML = '';

    this.engine.party.forEach((unit, i) => {
      const el = document.createElement('div');
      const isTargetable = this.engine.targetMode && this.engine.targetMode.targetType === 'ally' && !unit.downed;
      el.className = `unit-card${unit.downed ? ' downed' : ''}${this.selectedUnitIndex === i ? ' selected' : ''}${isTargetable ? ' targetable' : ''}`;
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
        </div>
      `;

      // Animate drain
      if (drainPct > hpPct) {
        requestAnimationFrame(() => {
          const drain = el.querySelector('.hp-drain');
          if (drain) drain.style.width = hpPct + '%';
        });
      }

      if (!unit.downed && this.engine.phase === PHASE.PLAYER_TURN) {
        if (isTargetable) {
          el.addEventListener('click', () => this.engine.selectTarget(unit));
        } else {
          el.addEventListener('click', () => this.onUnitClick(i));
        }
      }

      area.appendChild(el);
    });
  }

  onUnitClick(unitIndex) {
    if (this.engine.targetMode) return;
    if (this.selectedUnitIndex === unitIndex) {
      this.selectedUnitIndex = null;
    } else {
      this.selectedUnitIndex = unitIndex;
    }
    this.render();
  }

  // --- Skill Panel ---
  renderSkillPanel() {
    const panel = document.getElementById('skill-panel');
    const list = document.getElementById('skill-list');
    const nameEl = document.getElementById('skill-unit-name');

    if (this.selectedUnitIndex === null || this.engine.phase !== PHASE.PLAYER_TURN) {
      panel.classList.add('hidden');
      return;
    }

    const unit = this.engine.party[this.selectedUnitIndex];
    if (unit.downed) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    nameEl.textContent = `${unit.name} — Skills`;
    list.innerHTML = '';

    const skills = this.engine.getValidSkills(this.selectedUnitIndex);
    const selectedCount = this.selectedDice.length;

    skills.forEach(skill => {
      const el = document.createElement('div');
      el.className = `skill-btn${skill.canUse ? '' : ' disabled'}`;

      // Check if currently selected dice satisfy this skill's cost
      let diceMatch = false;
      if (selectedCount > 0 && skill.canUse && selectedCount === skill.cost.dice) {
        diceMatch = this.engine.dicePool.canPayCost(skill.cost, this.selectedDice);
      }

      el.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span></div>
        <div class="skill-desc">${skill.description}</div>
      `;

      if (diceMatch) {
        // Selected dice match — tap to activate
        el.classList.add('die-ready');
        el.addEventListener('click', () => {
          const diceIds = [...this.selectedDice];
          this.engine.beginSkillTarget(this.selectedUnitIndex, skill.id, diceIds);
          this.clearDiceSelection();
          this.selectedUnitIndex = null;
        });
      } else if (skill.canUse) {
        // Skill is usable but dice don't match yet — highlight valid dice
        el.addEventListener('click', () => this.highlightValidDice(skill));
      }

      list.appendChild(el);
    });

    // Close button
    document.getElementById('btn-close-skills').onclick = () => {
      this.selectedUnitIndex = null;
      this.render();
    };
  }

  highlightValidDice(skill) {
    const available = this.engine.dicePool.getAvailable();
    if (skill.cost.dice === 1) {
      // Highlight individual valid dice
      available.forEach(d => {
        if (this.engine.dicePool.canPayCost(skill.cost, [d.id])) {
          const el = document.querySelector(`.die[data-die-id="${d.id}"]`);
          if (el) {
            el.classList.add('highlight');
            setTimeout(() => el.classList.remove('highlight'), 800);
          }
        }
      });
    } else {
      // For multi-die skills, flash all unused dice as a hint
      available.forEach(d => {
        const el = document.querySelector(`.die[data-die-id="${d.id}"]`);
        if (el) {
          el.classList.add('highlight');
          setTimeout(() => el.classList.remove('highlight'), 800);
        }
      });
      this.engine.addLog(`Select ${skill.cost.dice} dice for ${skill.name} (${skill.cost.label}).`);
      this.renderLog();
    }
  }

  // --- Phase UI ---
  renderPhaseUI() {
    const phaseLabel = document.getElementById('phase-label');
    const rollBtn = document.getElementById('btn-roll');
    const endBtn = document.getElementById('btn-end-turn');

    rollBtn.classList.add('hidden');
    endBtn.classList.add('hidden');

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
      case PHASE.ROLL:
        phaseLabel.textContent = `TURN ${this.engine.turn} — ROLL`;
        rollBtn.classList.remove('hidden');
        rollBtn.textContent = 'Roll Dice';
        rollBtn.onclick = () => this.engine.rollDice();
        break;
      case PHASE.PLAYER_TURN:
        if (this.engine.targetMode) {
          const tm = this.engine.targetMode;
          phaseLabel.textContent = `SELECT TARGET FOR ${tm.skill.name.toUpperCase()}`;
          endBtn.classList.remove('hidden');
          endBtn.textContent = 'Cancel';
          endBtn.onclick = () => { this.engine.cancelTarget(); this.clearDiceSelection(); };
        } else {
          phaseLabel.textContent = `TURN ${this.engine.turn} — ASSIGN DICE`;
          endBtn.classList.remove('hidden');
          endBtn.textContent = 'End Turn';
          endBtn.onclick = () => { this.clearDiceSelection(); this.engine.endPlayerTurn(); };
        }
        break;
      case PHASE.ENEMY_TURN:
        phaseLabel.textContent = 'ENEMY TURN';
        break;
      case PHASE.VICTORY:
        phaseLabel.textContent = 'VICTORY';
        endBtn.classList.remove('hidden');
        endBtn.textContent = 'Continue';
        endBtn.onclick = () => this.onVictory();
        break;
      case PHASE.DEFEAT:
        phaseLabel.textContent = 'DEFEAT';
        endBtn.classList.remove('hidden');
        endBtn.textContent = 'Fall';
        endBtn.onclick = () => this.onDefeat();
        break;
    }
  }

  // --- Combat Log ---
  renderLog() {
    const content = document.getElementById('log-content');
    content.innerHTML = this.engine.log.map(l => `<div class="log-line">${l}</div>`).join('');
    content.scrollTop = content.scrollHeight;
  }

  addLog(text) {
    this.engine.addLog(text);
    this.renderLog();
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
    this.engine.afterEncounter();
    this.engine.encounterIndex++;

    if (this.engine.encounterIndex >= ENCOUNTERS.length) {
      this.showResult('SURVIVED', 'Your cohort escapes the Teutoburg Forest... for now.', true);
    } else {
      this.showResult('ENCOUNTER WON', 'The enemy falls. You press deeper into the forest.', false);
    }
  }

  onDefeat() {
    this.showResult('THE COHORT FALLS', 'The forest claims another Roman detachment. None will know where they fell.', true);
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
    if (isFinal) {
      nextBtn.textContent = 'New March';
      nextBtn.onclick = () => window.game.startNewRun();
    } else {
      nextBtn.textContent = 'Continue March';
      nextBtn.onclick = () => window.game.startNextEncounter();
    }
  }
}
