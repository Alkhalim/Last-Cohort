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
    this.mapNodes = null;
    this.currentNodeId = null;
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
      el.className = `enemy-card${enemy.dead ? ' dead' : ''}${this.isEnemyTargetable(enemy) ? ' targetable' : ''}${enemy.justSpawned ? ' spawning' : ''}${enemy.isBoss ? ' boss' : ''}`;
      el.id = `enemy-${i}`;

      const hpPct = (enemy.hp / enemy.maxHp) * 100;
      const prevHp = this.prevEnemyHp[i] !== undefined ? this.prevEnemyHp[i] : enemy.hp;
      const drainPct = (prevHp / enemy.maxHp) * 100;
      this.prevEnemyHp[i] = enemy.hp;

      el.innerHTML = `
        <div class="enemy-name">${enemy.name}${enemy.isBoss ? ' <span class="boss-icon">\u2620</span>' : ''}</div>
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
      hint.textContent = skill ? `${skill.name}: ${stagedDiceIds.length} dice (sum: ${sum}) \u2014 tap skill to confirm` : '';
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
      nameEl.textContent = `${unit.name} \u2014 Done`;
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

  // ================================================================
  // MAP SCREEN
  // ================================================================

  showMapScreen() {
    this.showScreen('map-screen');
    this.renderMapPartyBar();
    this.renderMapMorale();
    this.renderMap();
  }

  renderMapPartyBar() {
    const bar = document.getElementById('map-party-bar');
    bar.innerHTML = this.engine.party.map(u => {
      const pct = (u.hp / u.maxHp) * 100;
      return `<div class="map-party-unit${u.downed ? ' downed' : ''}">
        <span class="map-party-name">${u.title}</span>
        <div class="map-party-hp-bar">
          <div class="map-party-hp-fill${pct < 30 ? ' critical' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="map-party-hp-text">${u.hp}/${u.maxHp}</span>
      </div>`;
    }).join('');
  }

  renderMapMorale() {
    const title = document.getElementById('map-title');
    const diff = this.difficulty || 1;
    if (diff > 1) {
      title.textContent = `TEUTOBURG FOREST — MARCH ${diff}`;
    } else {
      title.textContent = 'TEUTOBURG FOREST';
    }

    const label = document.getElementById('map-morale-label');
    const band = getMoraleBand(this.engine.morale);
    label.textContent = `${band.label} (${this.engine.morale})`;
    label.style.color = band.color;
  }

  renderMap() {
    if (!this.mapNodes) return;

    const nodesLayer = document.getElementById('map-nodes-layer');
    const canvas = document.getElementById('map-canvas');
    const wrapper = document.getElementById('map-canvas-wrapper');
    const container = document.getElementById('map-scroll-container');

    // Calculate dimensions
    const maxDepth = 8;
    const nodeSpacing = 90;
    const topPadding = 60;
    const bottomPadding = 60;
    const totalHeight = topPadding + (maxDepth + 1) * nodeSpacing + bottomPadding;
    const wrapperWidth = wrapper.parentElement.clientWidth || 400;

    wrapper.style.height = totalHeight + 'px';
    wrapper.style.width = '100%';
    wrapper.style.position = 'relative';
    canvas.width = wrapperWidth;
    canvas.height = totalHeight;
    canvas.style.width = wrapperWidth + 'px';
    canvas.style.height = totalHeight + 'px';

    nodesLayer.innerHTML = '';
    nodesLayer.style.width = wrapperWidth + 'px';
    nodesLayer.style.height = totalHeight + 'px';

    const reachable = this.currentNodeId !== null ? getReachableNodes(this.mapNodes, this.currentNodeId) : [];
    const reachableIds = reachable.map(n => n.id);

    // If no current node, the start node (depth 0) is reachable
    const startReachable = this.currentNodeId === null;

    // Position nodes: bottom = start (depth 0), top = boss (depth 8)
    const nodePositions = {};
    for (const node of this.mapNodes) {
      const y = totalHeight - bottomPadding - node.depth * nodeSpacing;
      const x = node.x * (wrapperWidth - 80) + 40;
      nodePositions[node.id] = { x, y };
    }

    // Draw lines on canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;

    for (const node of this.mapNodes) {
      const from = nodePositions[node.id];
      for (const childId of node.children) {
        const to = nodePositions[childId];
        if (!to) continue;

        const childNode = this.mapNodes.find(n => n.id === childId);
        const isReachableLine = (node.id === this.currentNodeId) ||
          (startReachable && node.depth === 0);

        ctx.strokeStyle = isReachableLine ? 'rgba(201, 162, 39, 0.6)' : 'rgba(42, 46, 58, 0.5)';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }

    // Render node elements
    for (const node of this.mapNodes) {
      const pos = nodePositions[node.id];
      const el = document.createElement('div');

      const isReachableNode = startReachable ? (node.depth === 0) : reachableIds.includes(node.id);
      const isCurrent = node.id === this.currentNodeId;

      el.className = `map-node${node.visited ? ' visited' : ''}${isReachableNode ? ' reachable' : ''}${isCurrent ? ' current' : ''} type-${node.type}`;
      el.style.left = (pos.x - 22) + 'px';
      el.style.top = (pos.y - 22) + 'px';

      let icon = '';
      switch (node.type) {
        case 'combat': icon = '\u2694'; break;
        case 'event': icon = '\uD83D\uDCDC'; break;
        case 'rest': icon = '\uD83D\uDD25'; break;
        case 'boss': icon = '\uD83D\uDC80'; break;
      }

      let threatSkulls = '';
      if (node.type === 'combat' && node.threat > 0) {
        threatSkulls = `<div class="map-node-threat">${'\u2620'.repeat(node.threat)}</div>`;
      }

      el.innerHTML = `<span class="map-node-icon">${icon}</span>${threatSkulls}`;

      if (isReachableNode && !node.visited) {
        el.addEventListener('click', () => this.onMapNodeClick(node));
      }

      nodesLayer.appendChild(el);
    }

    // Scroll to show the current position (or bottom for start)
    if (this.currentNodeId !== null) {
      const pos = nodePositions[this.currentNodeId];
      container.scrollTop = pos.y - container.clientHeight / 2;
    } else {
      container.scrollTop = totalHeight;
    }
  }

  onMapNodeClick(node) {
    // Mark as visited and set current
    node.visited = true;
    this.currentNodeId = node.id;

    if (node.type === 'combat') {
      this.startCombatNode(node);
    } else if (node.type === 'boss') {
      this.startCombatNode(node);
    } else if (node.type === 'event') {
      this.startEventNode(node);
    } else if (node.type === 'rest') {
      this.startRestNode(node);
    }
  }

  startCombatNode(node) {
    this.engine.initEncounter(node.encounter);
    this.showScreen('combat-screen');
    this.selectedUnitIndex = null;
    this.stagedSkill = null;
    this.prevEnemyHp = {};
    this.prevUnitHp = {};
    this.diceRevealRunning = false;
    this.render();
  }

  // ================================================================
  // EVENT SCREEN
  // ================================================================

  startEventNode(node) {
    this.showScreen('event-screen');
    const event = node.encounter;

    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-intro').textContent = event.intro;
    document.getElementById('event-outcome').classList.add('hidden');

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    event.choices.forEach((choice, ci) => {
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => this.resolveEventChoice(event, choice));
      choicesEl.appendChild(btn);
    });
  }

  resolveEventChoice(event, choice) {
    // Weighted random outcome
    const roll = Math.random();
    let cumulative = 0;
    let outcome = choice.outcomes[0];
    for (const o of choice.outcomes) {
      cumulative += o.weight;
      if (roll < cumulative) { outcome = o; break; }
    }

    // Apply effects
    const effects = outcome.effects || {};
    if (effects.healAll) {
      this.engine.party.forEach(u => {
        if (!u.downed) {
          u.hp = Math.min(u.maxHp, u.hp + effects.healAll);
        }
      });
    }
    if (effects.damageAll) {
      this.engine.party.forEach(u => {
        if (!u.downed) {
          u.hp = Math.max(1, u.hp - effects.damageAll);
        }
      });
    }
    if (effects.morale) {
      this.engine.morale = Math.max(-100, Math.min(100, this.engine.morale + effects.morale));
    }
    if (effects.grantItem) {
      this.pendingEventItem = effects.grantItem;
    } else {
      this.pendingEventItem = null;
    }

    // Hide choices, show outcome
    document.getElementById('event-choices').innerHTML = '';
    document.getElementById('event-outcome').classList.remove('hidden');

    let outcomeText = outcome.text;
    if (effects.healAll) outcomeText += ` (Party healed ${effects.healAll} HP)`;
    if (effects.damageAll) outcomeText += ` (Party took ${effects.damageAll} damage)`;
    if (effects.morale && effects.morale > 0) outcomeText += ` (+${effects.morale} Morale)`;
    if (effects.morale && effects.morale < 0) outcomeText += ` (${effects.morale} Morale)`;
    if (effects.grantItem) {
      const item = getItemData(effects.grantItem);
      if (item) outcomeText += ` (Found: ${item.name})`;
    }

    document.getElementById('event-outcome-text').textContent = outcomeText;

    document.getElementById('btn-event-continue').onclick = () => {
      if (this.pendingEventItem) {
        this.showEventItemScreen(this.pendingEventItem);
      } else {
        this.showMapScreen();
      }
    };
  }

  showEventItemScreen(itemId) {
    const item = getItemData(itemId);
    if (!item) {
      this.showMapScreen();
      return;
    }

    // Reuse the loot screen for a single item
    this.pendingLoot = [itemId];
    this.lootScreenFinal = false;
    this.lootReturnToMap = true;
    this.showScreen('loot-screen');
    this.renderLootScreen();
  }

  // ================================================================
  // REST SCREEN
  // ================================================================

  startRestNode(node) {
    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = 'Rest';
    document.getElementById('event-intro').textContent = 'Your cohort finds a sheltered spot to rest. Wounds are tended, weapons sharpened, spirits lifted.';
    document.getElementById('event-choices').innerHTML = '';
    document.getElementById('event-outcome').classList.remove('hidden');

    // Heal all party 30% maxHP
    let healed = false;
    this.engine.party.forEach(u => {
      if (!u.downed) {
        const healAmt = Math.floor(u.maxHp * 0.3);
        const before = u.hp;
        u.hp = Math.min(u.maxHp, u.hp + healAmt);
        if (u.hp > before) healed = true;
      }
    });

    const text = healed
      ? 'The rest does the cohort good. Everyone recovers some strength.'
      : 'The cohort is already in good shape. The rest is brief but welcome.';
    document.getElementById('event-outcome-text').textContent = text + ' (Party healed 30% max HP)';

    document.getElementById('btn-event-continue').onclick = () => {
      this.showMapScreen();
    };
  }

  // ================================================================
  // POST-COMBAT
  // ================================================================

  onVictory() {
    const isBoss = this.engine.hasBossEnemy();
    const title = isBoss ? 'THE CHAMPION FALLS' : 'ENCOUNTER WON';
    const text = isBoss
      ? "Arminius's Champion lies defeated. The path is clear."
      : 'The enemy falls. You press deeper into the forest.';

    // Calculate renown for this encounter
    const renownEarned = this.engine.calculateRenown();
    this.engine.totalRenownEarned += renownEarned;
    this.engine.encountersCompleted++;

    this.showSummary(title, text, isBoss, renownEarned);
  }

  onDefeat() {
    this.showRunSummary(false);
  }

  showSummary(title, text, isBossOrDefeat, renownEarned) {
    this.showScreen('summary-screen');
    document.getElementById('summary-title').textContent = title;
    document.getElementById('summary-text').textContent = text;

    const statsEl = document.getElementById('summary-stats');
    let statsHtml = '';

    // Renown earned line
    if (renownEarned > 0) {
      statsHtml += `<div class="summary-renown">+${renownEarned} Renown</div>`;
    }

    statsHtml += this.engine.party.map(u => {
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

    statsEl.innerHTML = statsHtml;

    const continueBtn = document.getElementById('btn-summary-continue');
    if (title === 'THE COHORT FALLS') {
      continueBtn.textContent = 'New March';
      continueBtn.onclick = () => window.game.startNewRun();
    } else {
      continueBtn.textContent = 'Continue';
      continueBtn.onclick = () => this.showLootScreen(this.engine.hasBossEnemy());
    }
  }

  showLootScreen(isBossVictory) {
    this.engine.afterEncounter();

    // Award XP from killed enemies
    const totalXp = this.engine.killedEnemies.reduce((sum, eid) => {
      const data = ENEMY_DATA[eid];
      return sum + (data ? data.xpValue || 0 : 0);
    }, 0);
    if (totalXp > 0) {
      this.engine.party.forEach(u => {
        if (!u.downed) this.engine.awardXp(u, totalXp);
      });
    }

    // Roll drops — filter to items at least one party member can use
    this.pendingLoot = [];
    for (const enemyId of this.engine.killedEnemies) {
      const isBossEnemy = ENEMY_DATA[enemyId] && ENEMY_DATA[enemyId].isBoss;
      const itemId = rollDrop(enemyId, this.engine.party);
      if (!itemId) continue;
      const item = getItemData(itemId);
      if (!item) continue;
      // Only drop if someone in the party can equip it
      const canUse = this.engine.party.some(u => canEquipItem(u, item));
      if (canUse) this.pendingLoot.push(itemId);
    }

    // Boss guaranteed rare drop if nothing dropped
    if (isBossVictory && this.pendingLoot.length === 0) {
      const bossItem = BOSS_DROP_POOL[Math.floor(Math.random() * BOSS_DROP_POOL.length)];
      this.pendingLoot.push(bossItem);
    }

    this.lootScreenFinal = isBossVictory;
    this.lootReturnToMap = !isBossVictory;
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

        const eligible = this.engine.party.filter(u => canEquipItem(u, item));

        const equipBtns = eligible.map(u => {
          const slots = u.equipment[item.slot];
          const hasEmpty = slots.some(s => s === null);
          let replaceText = '';
          if (!hasEmpty) {
            // Would replace first slot item
            const firstItem = getItemData(slots[0]);
            replaceText = firstItem ? `Replaces: ${firstItem.name}` : '';
          }
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
      const xpInfo = getXpToNextLevel(u.xp);
      const xpStr = xpInfo !== null ? `Lv${u.level} (${u.xp}/${XP_PER_LEVEL[u.level] || '??'} XP)` : `Lv${u.level} (MAX)`;

      const slotHtml = ['weapon', 'armor', 'trinket'].map(slot => {
        const items = u.equipment[slot].map((id, si) => {
          const item = id ? getItemData(id) : null;
          return `<span class="equip-slot-item ${item ? 'rarity-' + item.rarity : 'empty'}">${item ? item.name : '\u2014'}</span>`;
        }).join(', ');
        return `<div class="equip-slot-row">
          <span class="equip-slot-label">${slot} (${EQUIP_SLOTS[slot]})</span>
          ${items}
        </div>`;
      }).join('');

      return `<div class="equip-unit">
        <div class="equip-unit-header">
          <span class="equip-unit-name">${u.title} ${u.name}</span>
          <span class="equip-unit-xp">${xpStr}</span>
        </div>
        ${slotHtml}
      </div>`;
    }).join('');

    if (this.lootScreenFinal) {
      continueBtn.textContent = 'Continue';
      continueBtn.onclick = () => this.showPostBossChoice();
    } else if (this.lootReturnToMap) {
      continueBtn.textContent = 'Continue March';
      continueBtn.onclick = () => this.showMapScreen();
    } else {
      continueBtn.textContent = 'Continue March';
      continueBtn.onclick = () => this.showMapScreen();
    }
  }

  equipLootItem(lootIndex, unitIndex) {
    const itemId = this.pendingLoot[lootIndex];
    if (!itemId) return;
    const success = this.engine.equipItem(unitIndex, itemId);
    if (success) {
      this.pendingLoot.splice(lootIndex, 1);
      this.renderLootScreen();
    }
  }

  // ================================================================
  // RUN COMPLETE
  // ================================================================

  showPostBossChoice() {
    this.showScreen('run-complete-screen');

    const diff = window.game.difficulty || 1;
    const marchLabel = diff === 1 ? 'First March' : `March ${diff}`;

    document.getElementById('run-complete-title').textContent = 'VICTORY';
    document.getElementById('run-complete-text').textContent =
      `Your cohort has defeated the Champion and broken through. The forest grows darker ahead, but there is still work to be done. Will you press on?`;

    const statsEl = document.getElementById('run-complete-stats');
    let html = '<div class="run-summary-section">';
    html += `<div class="run-summary-stat"><span class="run-summary-label">${marchLabel} Complete</span><span class="run-summary-value"></span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Encounters Completed</span><span class="run-summary-value">${this.engine.encountersCompleted}</span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Enemies Defeated</span><span class="run-summary-value">${this.engine.totalEnemiesKilled}</span></div>`;
    html += `<div class="run-summary-stat renown-stat"><span class="run-summary-label">Renown Earned</span><span class="run-summary-value renown-value">+${this.engine.totalRenownEarned}</span></div>`;
    html += '</div>';

    html += this.engine.party.map(u => {
      return `<div class="run-complete-unit">
        <span class="run-complete-unit-name">${u.title} ${u.name}</span>
        <span class="run-complete-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp} HP`}</span>
        <span class="run-complete-unit-level">Lv ${u.level}</span>
      </div>`;
    }).join('');

    statsEl.innerHTML = html;

    // Save renown
    window.game.addRunRenown(this.engine.totalRenownEarned);
    // Reset run renown counter so it doesn't double-count
    this.engine.totalRenownEarned = 0;

    // Two buttons: continue deeper or return home
    const btnContainer = document.getElementById('btn-run-complete');
    btnContainer.textContent = 'Deeper into the Forest';
    btnContainer.onclick = () => window.game.continueRun();

    // Add a secondary "Return Home" link if not already there
    let homeBtn = document.getElementById('btn-run-home');
    if (!homeBtn) {
      homeBtn = document.createElement('button');
      homeBtn.id = 'btn-run-home';
      homeBtn.className = 'btn-secondary';
      homeBtn.textContent = 'Return Home';
      btnContainer.parentElement.appendChild(homeBtn);
    }
    homeBtn.classList.remove('hidden');
    homeBtn.onclick = () => {
      homeBtn.classList.add('hidden');
      window.game.returnHome();
    };
  }

  showRunSummary(isVictory) {
    this.showScreen('run-complete-screen');

    document.getElementById('run-complete-title').textContent = 'DEFEAT';
    document.getElementById('run-complete-text').textContent =
      'The forest claims another Roman detachment. None will know where they fell.';

    const statsEl = document.getElementById('run-complete-stats');
    let html = '<div class="run-summary-section">';
    html += `<div class="run-summary-stat"><span class="run-summary-label">Encounters Completed</span><span class="run-summary-value">${this.engine.encountersCompleted}</span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Enemies Defeated</span><span class="run-summary-value">${this.engine.totalEnemiesKilled}</span></div>`;
    html += `<div class="run-summary-stat renown-stat"><span class="run-summary-label">Renown Earned</span><span class="run-summary-value renown-value">+${this.engine.totalRenownEarned}</span></div>`;
    html += '</div>';

    html += this.engine.party.map(u => {
      return `<div class="run-complete-unit">
        <span class="run-complete-unit-name">${u.title} ${u.name}</span>
        <span class="run-complete-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp} HP`}</span>
        <span class="run-complete-unit-level">Lv ${u.level}</span>
      </div>`;
    }).join('');

    statsEl.innerHTML = html;

    window.game.addRunRenown(this.engine.totalRenownEarned);

    // Hide the secondary button if it exists
    const homeBtn = document.getElementById('btn-run-home');
    if (homeBtn) homeBtn.classList.add('hidden');

    document.getElementById('btn-run-complete').textContent = 'Return Home';
    document.getElementById('btn-run-complete').onclick = () => window.game.returnHome();
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
