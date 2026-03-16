// ============================================================
// Last Cohort – UI Renderer
// ============================================================

class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.selectedDieId = null;
    this.selectedUnitIndex = null;
    this.diceElements = new Map();
    this.init();
  }

  init() {
    this.engine.onUpdate = () => this.render();
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
    // Map -100..100 to 0..100%
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
      el.className = `enemy-card ${enemy.dead ? 'dead' : ''} ${this.isEnemyTargetable(enemy) ? 'targetable' : ''}`;
      el.innerHTML = `
        <div class="enemy-name">${enemy.name}</div>
        <div class="hp-bar">
          <div class="hp-fill" style="width:${(enemy.hp / enemy.maxHp) * 100}%"></div>
        </div>
        <div class="hp-text">${enemy.hp}/${enemy.maxHp}</div>
      `;

      if (this.isEnemyTargetable(enemy)) {
        el.addEventListener('click', () => this.onEnemyClick(enemy));
      }

      if (enemy.row === 'front') {
        frontSlots.appendChild(el);
      } else {
        backSlots.appendChild(el);
      }
    });

    // Hide back row if empty
    const backAlive = this.engine.enemies.filter(e => e.row === 'back' && !e.dead);
    document.getElementById('enemy-row-back').classList.toggle('hidden', backAlive.length === 0);
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

    if (this.engine.phase === PHASE.ROLL || this.engine.phase === PHASE.PRE_COMBAT) {
      // Show empty dice slots
      for (let i = 0; i < 5; i++) {
        const el = document.createElement('div');
        el.className = 'die empty';
        el.textContent = '?';
        pool.appendChild(el);
      }
      return;
    }

    this.engine.dicePool.dice.forEach(die => {
      const el = document.createElement('div');
      el.className = `die ${die.used ? 'used' : ''} ${this.selectedDieId === die.id ? 'selected' : ''}`;
      el.textContent = die.value;
      el.dataset.dieId = die.id;

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
  }

  onDieClick(die) {
    if (die.used) return;
    if (this.selectedDieId === die.id) {
      this.selectedDieId = null;
    } else {
      this.selectedDieId = die.id;
    }
    this.render();
  }

  // --- Party ---
  renderParty() {
    const area = document.getElementById('party-area');
    area.innerHTML = '';

    this.engine.party.forEach((unit, i) => {
      const el = document.createElement('div');
      const isTargetable = this.engine.targetMode && this.engine.targetMode.targetType === 'ally' && !unit.downed;
      el.className = `unit-card ${unit.downed ? 'downed' : ''} ${this.selectedUnitIndex === i ? 'selected' : ''} ${isTargetable ? 'targetable' : ''}`;

      const hpPct = (unit.hp / unit.maxHp) * 100;
      el.innerHTML = `
        <div class="unit-header">
          <span class="unit-title">${unit.title}</span>
          <span class="unit-name">${unit.name}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill ${hpPct < 30 ? 'critical' : ''}" style="width:${hpPct}%"></div>
        </div>
        <div class="unit-stats">
          <span class="hp-text">${unit.hp}/${unit.maxHp}</span>
          ${unit.block > 0 ? `<span class="block-text">Block: ${unit.block}</span>` : ''}
          ${unit.downed ? '<span class="downed-text">DOWNED</span>' : ''}
        </div>
      `;

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
    skills.forEach(skill => {
      const el = document.createElement('div');
      el.className = `skill-btn ${skill.canUse ? '' : 'disabled'}`;

      // Check if selected die is valid for this skill
      let dieValid = false;
      if (this.selectedDieId !== null && skill.canUse) {
        if (skill.cost.dice === 1) {
          dieValid = this.engine.dicePool.canPayCost(skill.cost, [this.selectedDieId]);
        }
      }

      el.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span></div>
        <div class="skill-desc">${skill.description}</div>
      `;

      if (dieValid) {
        el.classList.add('die-ready');
        el.addEventListener('click', () => {
          this.engine.beginSkillTarget(this.selectedUnitIndex, skill.id, [this.selectedDieId]);
          this.selectedDieId = null;
          this.selectedUnitIndex = null;
        });
      } else if (skill.canUse && skill.cost.dice === 1) {
        // Let player click to see which dice work
        el.addEventListener('click', () => this.highlightValidDice(skill));
      } else if (skill.canUse && skill.cost.dice === 2) {
        el.classList.add('multi-die');
        el.addEventListener('click', () => this.startMultiDieSelect(this.selectedUnitIndex, skill));
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
    // Flash valid dice for this skill
    const available = this.engine.dicePool.getAvailable();
    available.forEach(d => {
      if (this.engine.dicePool.canPayCost(skill.cost, [d.id])) {
        const el = document.querySelector(`.die[data-die-id="${d.id}"]`);
        if (el) {
          el.classList.add('highlight');
          setTimeout(() => el.classList.remove('highlight'), 800);
        }
      }
    });
  }

  startMultiDieSelect(unitIndex, skill) {
    // For combined-cost skills: let player tap 2 dice then activate
    this.multiDieMode = { unitIndex, skill, selected: [] };
    this.addLog('Select ' + skill.cost.dice + ' dice for ' + skill.name);
    // Override die click behavior temporarily
    this._origDieClick = this.onDieClick.bind(this);
    this.onDieClick = (die) => {
      const mode = this.multiDieMode;
      if (!mode) return;
      const idx = mode.selected.indexOf(die.id);
      if (idx >= 0) {
        mode.selected.splice(idx, 1);
      } else {
        mode.selected.push(die.id);
      }
      if (mode.selected.length === skill.cost.dice) {
        if (this.engine.dicePool.canPayCost(skill.cost, mode.selected)) {
          this.engine.beginSkillTarget(mode.unitIndex, skill.id, mode.selected);
          this.selectedDieId = null;
          this.selectedUnitIndex = null;
        } else {
          this.engine.addLog('Those dice don\'t meet the cost. Try again.');
          mode.selected = [];
        }
        this.multiDieMode = null;
        this.onDieClick = this._origDieClick;
      }
      this.render();
    };
    this.render();
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
        phaseLabel.textContent = 'PREPARE FOR COMBAT';
        rollBtn.classList.remove('hidden');
        rollBtn.textContent = 'Begin';
        rollBtn.onclick = () => { this.engine.startRollPhase(); };
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
          endBtn.onclick = () => { this.engine.cancelTarget(); this.selectedDieId = null; };
        } else {
          phaseLabel.textContent = `TURN ${this.engine.turn} — ASSIGN DICE`;
          endBtn.classList.remove('hidden');
          endBtn.textContent = 'End Turn';
          endBtn.onclick = () => this.engine.endPlayerTurn();
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

  // --- Post-encounter ---
  onVictory() {
    this.engine.afterEncounter();
    this.engine.encounterIndex++;

    if (this.engine.encounterIndex >= ENCOUNTERS.length) {
      // All encounters cleared
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
