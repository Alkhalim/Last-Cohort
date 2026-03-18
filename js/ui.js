// ============================================================
// Last Cohort – UI Renderer
// ============================================================

class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.selectedUnitIndex = 0; // default to first unit
    this.stagedSkill = null;    // { skillId, diceIds[] } — skill clicked once, dice highlighted
    this.previewSkillId = null; // skill being hovered/held — highlights targets without staging
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
    this.bindMoraleTooltip();
  }

  bindMoraleTooltip() {
    const bar = document.getElementById('morale-bar');
    const tooltip = document.getElementById('morale-tooltip');
    if (!bar || !tooltip) return;

    const show = () => {
      const band = getMoraleBand(this.engine.morale);
      let effects = '';
      if (this.engine.morale >= 75) {
        effects = 'Inspired: +2 damage and +2 healing to all actions.';
      } else if (this.engine.morale >= 50) {
        effects = 'Confident: +1 damage and +1 healing to all actions.';
      } else if (this.engine.morale >= 25) {
        effects = 'Steady: Baseline performance. No modifiers.';
      } else if (this.engine.morale >= -24) {
        effects = 'Shaken: No major modifiers. Neutral state.';
      } else if (this.engine.morale >= -49) {
        effects = 'Distressed: Higher vulnerability to fear and curses.';
      } else if (this.engine.morale >= -74) {
        effects = 'Wavering: -1 damage and -1 healing to all actions.';
      } else {
        effects = 'Broken: -2 damage and -2 healing to all actions.';
      }
      tooltip.textContent = effects;
      tooltip.classList.remove('hidden');
    };
    const hide = () => { tooltip.classList.add('hidden'); };

    bar.addEventListener('mouseenter', show);
    bar.addEventListener('mouseleave', hide);
    let holdTimer = null;
    bar.addEventListener('touchstart', (e) => {
      holdTimer = setTimeout(show, 200);
    }, { passive: true });
    bar.addEventListener('touchend', () => { clearTimeout(holdTimer); hide(); });
    bar.addEventListener('touchcancel', () => { clearTimeout(holdTimer); hide(); });
  }

  handleVisual(type, data) {
    switch (type) {
      case 'enemyAttack':
        this.flashElement(`enemy-${data.enemyIndex}`, 'attacking', 600);
        break;
      case 'unitHit':
        this.flashElement(`unit-${data.unitIndex}`, 'hit', 600);
        this.showDamagePopup(`unit-${data.unitIndex}`, data.damage, 'damage');
        this.screenShake(data.damage);
        break;
      case 'unitHeal':
        this.flashElement(`unit-${data.unitIndex}`, 'healed', 600);
        this.showDamagePopup(`unit-${data.unitIndex}`, data.amount, 'heal');
        break;
      case 'unitBlock':
        this.flashElement(`unit-${data.unitIndex}`, 'blocked', 500);
        this.showDamagePopup(`unit-${data.unitIndex}`, data.amount, 'block');
        break;
      case 'morale':
        this.flashElement('morale-bar', data.amount > 0 ? 'morale-up' : 'morale-down', 600);
        this.showDamagePopup('morale-bar', data.amount, 'morale');
        break;
      case 'dicePassive':
        if (data.triggers) {
          data.triggers.forEach(t => {
            const dieEl = document.querySelector(`.die[data-die-id="${t.dieId}"]`);
            if (dieEl) {
              dieEl.classList.add('passive-trigger', `passive-${t.type}`);
              setTimeout(() => dieEl.classList.remove('passive-trigger', `passive-${t.type}`), 1200);
            }
          });
        }
        break;
    }
  }

  // Screen shake proportional to damage
  screenShake(damage) {
    const screen = document.getElementById('combat-screen');
    if (!screen) return;

    // Remove any existing shake class
    screen.classList.remove('shake-small', 'shake-medium', 'shake-heavy');

    // Force reflow so animation restarts
    void screen.offsetWidth;

    let shakeClass, duration;
    if (damage >= 8) {
      shakeClass = 'shake-heavy';
      duration = 500;
    } else if (damage >= 4) {
      shakeClass = 'shake-medium';
      duration = 400;
    } else {
      shakeClass = 'shake-small';
      duration = 300;
    }

    screen.classList.add(shakeClass);
    setTimeout(() => screen.classList.remove(shakeClass), duration);
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // --- Main render ---
  render() {
    this.hideEnemyTooltip();
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

    this.updateMoodClass();
  }

  // --- Enemies ---
  renderEnemies() {
    const frontSlots = document.querySelector('#enemy-row-front .enemy-slots');
    const backSlots = document.querySelector('#enemy-row-back .enemy-slots');
    frontSlots.innerHTML = '';
    backSlots.innerHTML = '';

    this.engine.enemies.forEach((enemy, i) => {
      const el = document.createElement('div');
      el.className = `enemy-card${enemy.dead ? ' dead' : ''}${this.isEnemyTargetable(enemy) ? ' targetable' : ''}${this.isEnemyPreview(enemy) ? ' preview' : ''}${enemy.justSpawned ? ' spawning' : ''}${enemy.isBoss ? ' boss' : ''}`;
      el.id = `enemy-${i}`;

      const hpPct = (enemy.hp / enemy.maxHp) * 100;
      const prevHp = this.prevEnemyHp[i] !== undefined ? this.prevEnemyHp[i] : enemy.hp;
      const drainPct = (prevHp / enemy.maxHp) * 100;
      this.prevEnemyHp[i] = enemy.hp;

      el.innerHTML = `
        <div class="enemy-name">${enemy.name}${enemy.isBoss ? ' <span class="boss-icon">\u2620</span>' : ''}</div>
        <div class="hp-bar">
          <div class="hp-drain" style="width:${drainPct}%"></div>
          <div class="hp-fill ${hpPct < 20 ? 'critical' : hpPct < 40 ? 'hp-low' : hpPct < 65 ? 'hp-mid' : ''}" style="width:${hpPct}%"></div>
        </div>
        <div class="hp-text">${enemy.hp}/${enemy.maxHp}${enemy.block > 0 ? ` <span class="block-text">B:${enemy.block}</span>` : ''}${enemy.poison > 0 ? ` <span class="poison-text">P:${enemy.poison}</span>` : ''}</div>
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

      // Enemy info tooltip on hover / long-press (not during spawn/pre-combat)
      if (!enemy.dead && this.engine.phase !== PHASE.SPAWNING && this.engine.phase !== PHASE.PRE_COMBAT) {
        el.addEventListener('mouseenter', () => this.showEnemyTooltip(enemy, el));
        el.addEventListener('mouseleave', () => this.hideEnemyTooltip());
        let holdTimer = null;
        el.addEventListener('touchstart', () => {
          holdTimer = setTimeout(() => this.showEnemyTooltip(enemy, el), 300);
        }, { passive: true });
        el.addEventListener('touchend', () => { clearTimeout(holdTimer); this.hideEnemyTooltip(); });
        el.addEventListener('touchcancel', () => { clearTimeout(holdTimer); this.hideEnemyTooltip(); });
      }

      (enemy.row === 'front' ? frontSlots : backSlots).appendChild(el);
    });

    const backExists = this.engine.enemies.some(e => e.row === 'back');
    document.getElementById('enemy-row-back').classList.toggle('hidden', !backExists);
  }

  showEnemyTooltip(enemy, el) {
    this.hideEnemyTooltip();
    const tooltip = document.createElement('div');
    tooltip.id = 'enemy-tooltip';
    tooltip.className = 'enemy-tooltip';

    const actions = enemy.actions.map(a => {
      let desc = a.name;
      const details = [];
      if (a.damage > 0) details.push(`${a.damage} dmg`);
      if (a.poisonTarget) details.push(`${a.poisonTarget} poison`);
      if (a.morale) details.push(`${a.morale} morale`);
      if (a.blockAllEnemies) details.push(`+${a.blockAllEnemies} block to allies`);
      if (a.spawn) details.push('spawns unit');
      if (a.aoe) details.push('AOE');
      if (a.ignoreRow) details.push('any row');
      if (details.length > 0) desc += ` (${details.join(', ')})`;
      return `<div class="enemy-tooltip-action">${desc}</div>`;
    }).join('');

    const tags = [];
    if (enemy.isBoss) tags.push('<span class="enemy-tag tag-boss">BOSS</span>');
    if (enemy.isElite) tags.push('<span class="enemy-tag tag-elite">ELITE</span>');
    tags.push(`<span class="enemy-tag">${enemy.row} row</span>`);

    tooltip.innerHTML = `
      <div class="enemy-tooltip-name">${enemy.name}</div>
      <div class="enemy-tooltip-tags">${tags.join(' ')}</div>
      <div class="enemy-tooltip-desc">${enemy.description || ''}</div>
      <div class="enemy-tooltip-actions-title">Attacks:</div>
      ${actions}
    `;

    const rect = el.getBoundingClientRect();
    const gameRect = document.getElementById('game').getBoundingClientRect();
    tooltip.style.left = Math.max(4, rect.left - gameRect.left) + 'px';
    tooltip.style.top = (rect.bottom - gameRect.top + 4) + 'px';

    document.getElementById('combat-screen').appendChild(tooltip);
  }

  hideEnemyTooltip() {
    const existing = document.getElementById('enemy-tooltip');
    if (existing) existing.remove();
  }

  isEnemyTargetable(enemy) {
    if (enemy.dead) return false;
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'enemy') {
      return this.engine.getValidEnemyTargets(this.engine.targetMode.skill).includes(enemy);
    }
    // Staged skill targeting
    if (this.stagedSkill && this.selectedUnitIndex !== null) {
      const unit = this.engine.party[this.selectedUnitIndex];
      if (!unit) return false;
      const skill = unit.skills.find(s => s.id === this.stagedSkill.skillId);
      if (!skill) return false;
      if (skill.target !== TARGET.SINGLE_ENEMY && skill.target !== TARGET.ALL_ENEMIES) return false;
      const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
      if (!canPay) return false;
      if (skill.target === TARGET.ALL_ENEMIES) return true;
      return this.engine.getValidEnemyTargets(skill).includes(enemy);
    }
    return false;
  }

  isEnemyPreview(enemy) {
    if (enemy.dead) return false;
    const skill = this.getPreviewSkill();
    if (!skill) return false;
    if (skill.target !== TARGET.SINGLE_ENEMY && skill.target !== TARGET.ALL_ENEMIES) return false;
    if (skill.target === TARGET.ALL_ENEMIES) return true;
    return this.engine.getValidEnemyTargets(skill).includes(enemy);
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
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'ally') return true;
    if (this.stagedSkill && this.selectedUnitIndex !== null) {
      const caster = this.engine.party[this.selectedUnitIndex];
      if (!caster) return false;
      const skill = caster.skills.find(s => s.id === this.stagedSkill.skillId);
      if (!skill) return false;
      const validTargets = [TARGET.SINGLE_ALLY, TARGET.ALL_ALLIES, TARGET.SELF];
      if (!validTargets.includes(skill.target)) return false;
      // Self-target: only the caster is targetable
      if (skill.target === TARGET.SELF && unit.index !== caster.index) return false;
      const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
      return canPay;
    }
    return false;
  }

  isAllyPreview(unit) {
    if (unit.downed) return false;
    const skill = this.getPreviewSkill();
    if (!skill) return false;
    if (skill.target === TARGET.SELF) {
      const caster = this.engine.party[this.selectedUnitIndex];
      return caster && unit.index === caster.index;
    }
    return skill.target === TARGET.SINGLE_ALLY || skill.target === TARGET.ALL_ALLIES;
  }

  // --- Dice Pool ---
  renderDicePool() {
    const pool = document.getElementById('dice-pool');
    pool.innerHTML = '';

    // Reset hint slot
    const hintSlot = document.getElementById('dice-hint-slot');
    if (hintSlot) hintSlot.innerHTML = '&nbsp;';

    if (this.engine.phase === PHASE.PRE_COMBAT || this.engine.phase === PHASE.SPAWNING) {
      for (let i = 0; i < this.engine.dicePool.count; i++) {
        const el = document.createElement('div');
        el.className = 'die empty';
        el.textContent = '?';
        pool.appendChild(el);
      }
      return;
    }

    // Rolling phase: all dice shake with random numbers, settle one by one
    if (this.engine.phase === PHASE.ROLLING) {
      this.engine.dicePool.dice.forEach((die, i) => {
        const el = document.createElement('div');
        if (i < this.diceRevealed) {
          // Settled
          el.className = 'die settled';
          el.textContent = die.value;
        } else {
          // Shaking — show random number
          el.className = 'die shaking';
          el.textContent = Math.floor(Math.random() * 6) + 1;
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

      // Cornicen reroll button
      if (!die.used && this.engine.canRerollDie() && this.engine.phase === PHASE.PLAYER_TURN && !this.stagedSkill) {
        const rerollBtn = document.createElement('button');
        rerollBtn.className = 'reroll-btn';
        rerollBtn.textContent = '↻';
        rerollBtn.addEventListener('click', (e) => { e.stopPropagation(); this.engine.rerollDie(die.id); });
        el.appendChild(rerollBtn);
      }

      pool.appendChild(el);
    });

    // Update staged dice hint in the fixed slot
    if (hintSlot && stagedDiceIds.length > 0) {
      const sum = stagedDiceIds.reduce((s, id) => {
        const d = this.engine.dicePool.dice.find(x => x.id === id);
        return s + (d ? d.value : 0);
      }, 0);
      const skill = this.stagedSkill ? this.engine.party[this.selectedUnitIndex].skills.find(s => s.id === this.stagedSkill.skillId) : null;
      hintSlot.textContent = skill ? `${skill.name}: ${stagedDiceIds.length} dice (sum: ${sum})` : '';
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

  // Dice reveal: all dice shake with cycling numbers, then settle one by one
  startDiceReveal() {
    this.diceRevealed = 0;

    // Shake phase: cycle random numbers on all dice for ~800ms
    let shakeFrames = 0;
    const shakeInterval = setInterval(() => {
      this.renderDicePool(); // re-renders with new random numbers
      shakeFrames++;
      if (shakeFrames > 12) { // ~60ms * 12 = ~720ms of shaking
        clearInterval(shakeInterval);
        this.settleNextDie();
      }
    }, 60);
  }

  settleNextDie() {
    if (this.diceRevealed >= this.engine.dicePool.count) {
      this.diceRevealRunning = false;
      this.diceRevealed = 0;
      setTimeout(() => this.engine.onDiceRevealed(), 200);
      return;
    }
    this.diceRevealed++;
    this.renderDicePool();
    setTimeout(() => this.settleNextDie(), 150);
  }

  // --- Party ---
  renderParty() {
    const area = document.getElementById('party-area');
    area.innerHTML = '';

    this.engine.party.forEach((unit, i) => {
      const el = document.createElement('div');
      const isTargetable = this.isAllyTargetable(unit);
      const isPreview = this.isAllyPreview(unit);
      const isSelected = this.selectedUnitIndex === i;
      const primaryTag = getPrimaryTag(unit.classId);
      el.className = `unit-card class-${primaryTag}${unit.downed ? ' downed' : ''}${isSelected ? ' selected' : ''}${isTargetable ? ' targetable' : ''}${isPreview ? ' preview' : ''}${unit.actedThisTurn ? ' acted' : ''}`;
      el.id = `unit-${i}`;

      const hpPct = (unit.hp / unit.maxHp) * 100;
      const prevHp = this.prevUnitHp[i] !== undefined ? this.prevUnitHp[i] : unit.hp;
      const drainPct = (prevHp / unit.maxHp) * 100;
      this.prevUnitHp[i] = unit.hp;

      const isHealing = hpPct > drainPct;
      const isDamaged = drainPct > hpPct;
      // For healing: start fill at old %, animate up. For damage: drain trails behind.
      const fillStartPct = isHealing ? drainPct : hpPct;

      el.innerHTML = `
        <div class="unit-header">
          <span class="unit-title">${unit.title}</span>
          <span class="unit-name">${unit.name}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-drain" style="width:${drainPct}%"></div>
          <div class="hp-fill ${isHealing ? 'healing' : ''} ${hpPct < 20 ? 'critical' : hpPct < 40 ? 'hp-low' : hpPct < 65 ? 'hp-mid' : ''}" style="width:${fillStartPct}%"></div>
        </div>
        <div class="unit-stats">
          <span class="hp-text">${unit.hp}/${unit.maxHp}</span>
          ${unit.block > 0 ? `<span class="block-text">Block: ${unit.block}</span>` : ''}
          ${unit.poison > 0 ? `<span class="poison-text">Poison: ${unit.poison}</span>` : ''}
          ${unit.buffs && unit.buffs.length > 0 ? (() => { const totalDmg = unit.buffs.reduce((s, b) => s + (b.damage || 0), 0); const minAtk = Math.min(...unit.buffs.map(b => b.attacksLeft)); return `<span class="buff-text">+${totalDmg} dmg (${minAtk})</span>`; })() : ''}
          ${unit.downed ? '<span class="downed-text">DOWNED</span>' : ''}
          ${unit.actedThisTurn && !unit.downed ? '<span class="acted-text">DONE</span>' : ''}
        </div>
      `;

      if (isDamaged) {
        requestAnimationFrame(() => {
          const drain = el.querySelector('.hp-drain');
          if (drain) drain.style.width = hpPct + '%';
        });
      } else if (isHealing) {
        requestAnimationFrame(() => {
          const fill = el.querySelector('.hp-fill');
          if (fill) fill.style.width = hpPct + '%';
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
    // Apply class color to skill panel
    panel.className = 'class-' + getPrimaryTag(unit ? unit.classId : 'legionary');

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

    // Compute equipment bonuses for modified descriptions
    const equipDmg = unit.equipDamage || 0;
    const equipBlock = unit.equipBlock || 0;
    const equipHeal = unit.equipHeal || 0;
    const buffDmg = (unit.buffs || []).reduce((s, b) => s + (b.damage || 0), 0);
    let moraleMod = 0;
    if (this.engine.morale >= 75) moraleMod = 2;
    else if (this.engine.morale >= 50) moraleMod = 1;
    else if (this.engine.morale <= -75) moraleMod = -2;
    else if (this.engine.morale <= -50) moraleMod = -1;
    const totalBonusDmg = equipDmg + buffDmg + moraleMod;
    const totalBonusHeal = equipHeal + moraleMod;

    skills.forEach(skill => {
      const el = document.createElement('div');
      const isStaged = this.stagedSkill && this.stagedSkill.skillId === skill.id;

      el.className = `skill-btn${skill.canUse ? '' : ' disabled'}${isStaged ? ' staged' : ''}`;

      // Build modified description — show only totals, color-coded
      let desc = skill.description;

      const auraReduction = this.engine.enemies
        ? this.engine.enemies.filter(e => !e.dead && e.aura && e.aura.damageReduction).reduce((s, e) => s + e.aura.damageReduction, 0)
        : 0;
      const effectiveBonusDmg = totalBonusDmg - auraReduction;

      // Replace damage values with colored totals
      if (effectiveBonusDmg !== 0 || auraReduction > 0) {
        desc = desc.replace(/Deals (\d+) damage/g, (match, base) => {
          const total = Math.max(1, parseInt(base) + effectiveBonusDmg);
          return `Deals <span class="stat-dmg">${total}</span> damage`;
        });
      }
      // Replace block values
      if (equipBlock > 0) {
        desc = desc.replace(/(\d+) Block/g, (match, base) => {
          const total = parseInt(base) + equipBlock;
          return `<span class="stat-block">${total}</span> Block`;
        });
      }
      // Replace heal values
      if (totalBonusHeal !== 0) {
        desc = desc.replace(/(\d+) HP/g, (match, base) => {
          const total = Math.max(0, parseInt(base) + totalBonusHeal);
          return `<span class="stat-heal">${total}</span> HP`;
        });
      }

      // Color-code base stat keywords even without bonuses
      desc = desc.replace(/(\d+) damage/g, '<span class="stat-dmg">$1</span> damage');
      desc = desc.replace(/(\d+) Block/g, '<span class="stat-block">$1</span> Block');
      desc = desc.replace(/(\d+) HP/g, '<span class="stat-heal">$1</span> HP');
      desc = desc.replace(/(\d+) Poison/g, '<span class="stat-poison">$1</span> Poison');
      desc = desc.replace(/(\d+) Morale/g, '<span class="stat-morale-text">$1</span> Morale');

      el.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span></div>
        <div class="skill-desc">${desc}</div>
      `;

      if (skill.canUse) {
        el.addEventListener('click', () => this.onSkillClick(skill));
        // Hover: highlight targets on desktop
        el.addEventListener('mouseenter', () => this.setPreviewSkill(skill));
        el.addEventListener('mouseleave', () => this.clearPreviewSkill());
        // Long-press: highlight targets on mobile
        let holdTimer = null;
        el.addEventListener('touchstart', (e) => {
          holdTimer = setTimeout(() => {
            this.setPreviewSkill(skill);
          }, 300);
        }, { passive: true });
        el.addEventListener('touchend', () => {
          clearTimeout(holdTimer);
          this.clearPreviewSkill();
        });
        el.addEventListener('touchcancel', () => {
          clearTimeout(holdTimer);
          this.clearPreviewSkill();
        });
      }

      list.appendChild(el);
    });

    confirmBtn.classList.add('hidden');
  }

  setPreviewSkill(skill) {
    if (this.stagedSkill) return; // don't override staged
    this.previewSkillId = skill.id;
    this.renderEnemies();
    this.renderParty();
  }

  clearPreviewSkill() {
    if (!this.previewSkillId) return;
    this.previewSkillId = null;
    this.renderEnemies();
    this.renderParty();
  }

  getPreviewSkill() {
    if (!this.previewSkillId || this.selectedUnitIndex === null) return null;
    const unit = this.engine.party[this.selectedUnitIndex];
    if (!unit || unit.downed || unit.actedThisTurn) return null;
    return unit.skills.find(s => s.id === this.previewSkillId) || null;
  }

  onSkillClick(skill) {
    this.previewSkillId = null;
    if (this.stagedSkill && this.stagedSkill.skillId === skill.id) {
      // Clicking same skill again — unstage
      this.stagedSkill = null;
      this.render();
      return;
    }

    // Stage this skill with auto-picked dice — always stage, never execute immediately
    const autoDice = this.engine.autoPick(skill);
    this.stagedSkill = { skillId: skill.id, diceIds: autoDice };
    // Render so targets light up (self, allies, or enemies)
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

    // For self/all-target skills, pass appropriate targets
    if (skill.target === TARGET.SELF || skill.target === TARGET.ALL_ALLIES || skill.target === TARGET.ALL_ENEMIES) {
      this.engine.beginSkillTarget(unitIndex, skill.id, diceIds);
    } else {
      this.engine.executeSkill(unitIndex, skill.id, diceIds, [target]);
    }
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
    const screen = document.getElementById('combat-screen');

    rollBtn.classList.add('hidden');

    // Clear phase-specific classes
    phaseLabel.classList.remove('phase-flash', 'phase-victory', 'phase-defeat', 'phase-enemy-turn');
    screen.classList.remove('enemy-turn-active', 'spawn-darken');

    switch (this.engine.phase) {
      case PHASE.PRE_COMBAT:
        phaseLabel.textContent = 'ENCOUNTER';
        rollBtn.classList.remove('hidden');
        rollBtn.textContent = 'Begin Encounter';
        rollBtn.onclick = () => { this.engine.beginSpawning(); };
        break;
      case PHASE.SPAWNING:
        phaseLabel.textContent = 'ENEMIES APPEAR...';
        screen.classList.add('spawn-darken');
        this.triggerPhaseFlash(phaseLabel);
        break;
      case PHASE.ROLLING:
        phaseLabel.textContent = `TURN ${this.engine.turn}`;
        this.triggerPhaseFlash(phaseLabel);
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
        phaseLabel.classList.add('phase-enemy-turn');
        screen.classList.add('enemy-turn-active');
        this.triggerPhaseFlash(phaseLabel);
        break;
      case PHASE.VICTORY:
        phaseLabel.textContent = 'VICTORY';
        phaseLabel.classList.add('phase-victory');
        if (!this._victoryTimeout) {
          this._victoryTimeout = setTimeout(() => {
            this._victoryTimeout = null;
            this.onVictory();
          }, 1200);
        }
        break;
      case PHASE.DEFEAT:
        phaseLabel.textContent = 'DEFEAT';
        phaseLabel.classList.add('phase-defeat');
        if (!this._defeatTimeout) {
          this._defeatTimeout = setTimeout(() => {
            this._defeatTimeout = null;
            this.onDefeat();
          }, 1500);
        }
        break;
    }

    logToggle.onclick = () => this.toggleLog();
  }

  // Trigger the phase flash animation (force restart)
  triggerPhaseFlash(el) {
    el.classList.remove('phase-flash');
    void el.offsetWidth;
    el.classList.add('phase-flash');
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
    popup.className = `damage-popup${type === 'heal' ? ' heal' : ''}${type === 'morale' ? ' morale' : ''}${type === 'block' ? ' block' : ''}`;
    if (type === 'damage') {
      popup.textContent = `-${amount}`;
    } else if (type === 'heal') {
      popup.textContent = `+${amount}`;
    } else if (type === 'block') {
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
    // Resume gameplay music if coming back from boss
    if (window.game && window.game.musicMode === 'boss') {
      window.game.resumeGameplayMusic();
    }
  }

  renderMapPartyBar() {
    const bar = document.getElementById('map-party-bar');
    bar.innerHTML = this.engine.party.map(u => {
      const pct = (u.hp / u.maxHp) * 100;
      return `<div class="map-party-unit${u.downed ? ' downed' : ''}">
        <span class="map-party-name" style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span>
        <div class="map-party-hp-bar">
          <div class="map-party-hp-fill${pct < 20 ? ' critical' : pct < 40 ? ' hp-low' : pct < 65 ? ' hp-mid' : ''}" style="width:${pct}%"></div>
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

    // Update mood class on #game for map/event/summary screens too
    this.updateMoodClass();
  }

  updateMoodClass() {
    const gameEl = document.getElementById('game');
    if (!gameEl) return;
    const morale = this.engine.morale;
    gameEl.classList.remove('mood-inspired', 'mood-steady', 'mood-shaken', 'mood-distressed', 'mood-broken');
    if (morale >= 75) gameEl.classList.add('mood-inspired');
    else if (morale >= 25) gameEl.classList.add('mood-steady');
    else if (morale >= -24) gameEl.classList.add('mood-shaken');
    else if (morale >= -74) gameEl.classList.add('mood-distressed');
    else gameEl.classList.add('mood-broken');

    if (window.game) window.game.updateMoraleLowpass(morale);
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

    // Fog of war: only show nodes within 2 depths of current position, or visited
    const currentNode = this.currentNodeId !== null ? this.mapNodes.find(n => n.id === this.currentNodeId) : null;
    const currentDepth = currentNode ? currentNode.depth : 0;
    const visibleRange = 2;

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

    // Helper: is a node visible (within range or visited)
    const isVisible = (node) => node.visited || (node.depth >= currentDepth && node.depth <= currentDepth + visibleRange);

    for (const node of this.mapNodes) {
      if (!isVisible(node)) continue;
      const from = nodePositions[node.id];
      for (const childId of node.children) {
        const childNode = this.mapNodes.find(n => n.id === childId);
        if (!childNode || !isVisible(childNode)) continue;
        const to = nodePositions[childId];
        if (!to) continue;

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
      if (!isVisible(node)) continue;
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
      window.game.startBossMusic();
      this.startCombatNode(node);
    } else if (node.type === 'event') {
      this.startEventNode(node);
    } else if (node.type === 'rest') {
      this.startRestNode(node);
    }
  }

  startCombatNode(node) {
    this.currentNodeThreat = node.threat || 1;
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
    const event = node.encounter;

    // Handle special event types
    if (event.type === 'skill_upgrade') {
      this.showSkillUpgradeEvent(event);
      return;
    }
    if (event.type === 'item_upgrade') {
      this.showItemUpgradeEvent(event);
      return;
    }

    this.showScreen('event-screen');
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
      const grantedItem = getItemData(effects.grantItem);
      const canUse = grantedItem && this.engine.party.some(u => canEquipItem(u, grantedItem));
      if (canUse) {
        this.pendingEventItem = effects.grantItem;
      } else {
        // Nobody can use it — convert to Renown
        this.pendingEventItem = null;
        const renownGain = { common: 2, uncommon: 5, rare: 10 }[grantedItem ? grantedItem.rarity : 'common'] || 2;
        this.engine.totalRenownEarned += renownGain;
      }
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
      if (this.pendingEventItem) {
        if (item) outcomeText += ` (Found: ${item.name})`;
      } else {
        const renownGain = { common: 2, uncommon: 5, rare: 10 }[item ? item.rarity : 'common'] || 2;
        outcomeText += ` (No one can use ${item ? item.name : 'this'} — +${renownGain} Renown)`;
      }
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
  // SKILL UPGRADE EVENT
  // ================================================================

  showSkillUpgradeEvent(event) {
    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-intro').textContent = event.intro;
    document.getElementById('event-outcome').classList.add('hidden');
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    // Gather all learned skills from all units, pick 3 random
    const allSkills = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        u.skills.forEach(s => {
          // Find the base skill data to get base effects
          const baseDef = u.allSkills.find(a => a.id === s.id);
          if (baseDef) allSkills.push({ unit: u, skill: s, baseDef });
        });
      }
    });

    const shuffled = allSkills.sort(() => Math.random() - 0.5).slice(0, 3);

    if (shuffled.length === 0) {
      choicesEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">No skills to improve.</div>';
      document.getElementById('event-outcome').classList.remove('hidden');
      document.getElementById('event-outcome-text').textContent = 'The clearing stands empty.';
      document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
      return;
    }

    shuffled.forEach(({ unit, skill, baseDef }) => {
      // Determine what to upgrade
      const effects = baseDef.effects || {};
      let upgradeText = '';
      if (effects.damage) upgradeText = `+1 base damage (${effects.damage} → ${effects.damage + 1})`;
      else if (effects.heal) upgradeText = `+1 base healing (${effects.heal} → ${effects.heal + 1})`;
      else if (effects.healAll) upgradeText = `+1 base healing (${effects.healAll} → ${effects.healAll + 1})`;
      else if (effects.block) upgradeText = `+1 base block (${effects.block} → ${effects.block + 1})`;
      else if (effects.blockAll) upgradeText = `+1 base block (${effects.blockAll} → ${effects.blockAll + 1})`;
      else if (effects.poison) upgradeText = `+1 base poison (${effects.poison} → ${effects.poison + 1})`;
      else if (effects.poisonAll) upgradeText = `+1 base poison (${effects.poisonAll} → ${effects.poisonAll + 1})`;
      else if (effects.morale) upgradeText = `+5 morale (${effects.morale} → ${effects.morale + 5})`;
      else upgradeText = '+1 to primary effect';

      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      const tag = getPrimaryTag(unit.classId);
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong>${skill.name}</strong><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;

      btn.addEventListener('click', () => {
        // Apply upgrade to the skill's effects on the baseDef (permanent)
        if (effects.damage) baseDef.effects.damage++;
        else if (effects.heal) baseDef.effects.heal++;
        else if (effects.healAll) baseDef.effects.healAll++;
        else if (effects.block) baseDef.effects.block++;
        else if (effects.blockAll) baseDef.effects.blockAll++;
        else if (effects.poison) baseDef.effects.poison++;
        else if (effects.poisonAll) baseDef.effects.poisonAll++;
        else if (effects.morale) baseDef.effects.morale += 5;

        // Also update the runtime skill copy
        const runtimeSkill = unit.skills.find(s => s.id === skill.id);
        if (runtimeSkill && runtimeSkill.execute) {
          // Rebuild execute from updated baseDef
          // The execute is rebuilt from effects via buildSkillExecute
        }

        // Update description
        const oldDesc = baseDef.description;
        baseDef.description = oldDesc.replace(/\d+/, (m) => String(parseInt(m) + 1));

        choicesEl.innerHTML = '';
        document.getElementById('event-outcome').classList.remove('hidden');
        document.getElementById('event-outcome-text').textContent = `${unit.name}'s ${skill.name} has been improved! ${upgradeText}`;
        document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
      });

      choicesEl.appendChild(btn);
    });

    // Skip option
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-event-choice';
    skipBtn.innerHTML = '<span style="color:var(--text-dim)">Leave the clearing.</span>';
    skipBtn.addEventListener('click', () => this.showMapScreen());
    choicesEl.appendChild(skipBtn);
  }

  // ================================================================
  // ITEM UPGRADE EVENT
  // ================================================================

  showItemUpgradeEvent(event) {
    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-intro').textContent = event.intro;
    document.getElementById('event-outcome').classList.add('hidden');
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    // Gather all equipped items
    const allItems = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (!id) return;
            const item = getItemData(id);
            if (item) allItems.push({ unit: u, itemId: id, item });
          });
        }
      }
    });

    // Pick up to 3 random items
    const shuffled = allItems.sort(() => Math.random() - 0.5).slice(0, 3);

    if (shuffled.length === 0) {
      choicesEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">No equipment to improve.</div>';
      document.getElementById('event-outcome').classList.remove('hidden');
      document.getElementById('event-outcome-text').textContent = 'The smith has nothing to work with.';
      document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
      return;
    }

    shuffled.forEach(({ unit, itemId, item }) => {
      // Determine upgrade: +1 to primary stat
      const stats = item.stats;
      let upgradeText = '';
      let statKey = '';
      if (stats.damage) { statKey = 'damage'; upgradeText = `+1 damage (${stats.damage} → ${stats.damage + 1})`; }
      else if (stats.block) { statKey = 'block'; upgradeText = `+1 block (${stats.block} → ${stats.block + 1})`; }
      else if (stats.heal) { statKey = 'heal'; upgradeText = `+1 heal (${stats.heal} → ${stats.heal + 1})`; }
      else if (stats.maxHp) { statKey = 'maxHp'; upgradeText = `+2 HP (${stats.maxHp} → ${stats.maxHp + 2})`; }
      else if (stats.extraDice) { upgradeText = 'Already at maximum power.'; statKey = ''; }
      else { upgradeText = '+1 to primary stat'; statKey = Object.keys(stats)[0]; }

      const tag = getPrimaryTag(unit.classId);
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong>${item.name}</strong> ${renderTagPips(item.classTags)}<br><span style="font-size:0.75rem;color:var(--text-dim)">${formatItemStats(stats)}</span><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;

      if (!statKey) {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
      } else {
        btn.addEventListener('click', () => {
          // Apply upgrade permanently to ITEM_DATA
          if (statKey === 'maxHp') {
            ITEM_DATA[itemId].stats[statKey] += 2;
            // Also apply HP gain to the unit
            unit.maxHp += 2;
            unit.baseMaxHp += 2;
            unit.hp += 2;
          } else {
            ITEM_DATA[itemId].stats[statKey]++;
          }
          // Recompute equipment stats
          this.engine.computeEquipmentStats(unit);

          choicesEl.innerHTML = '';
          document.getElementById('event-outcome').classList.remove('hidden');
          document.getElementById('event-outcome-text').textContent = `The smith improves ${item.name}! ${upgradeText}`;
          document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
        });
      }

      choicesEl.appendChild(btn);
    });

    // Skip option
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-event-choice';
    skipBtn.innerHTML = '<span style="color:var(--text-dim)">Decline the smith\'s offer.</span>';
    skipBtn.addEventListener('click', () => this.showMapScreen());
    choicesEl.appendChild(skipBtn);
  }

  // ================================================================
  // REST SCREEN
  // ================================================================

  startRestNode(node) {
    this.campActionsLeft = 2;
    this.campLog = [];
    this.showCampScreen();
  }

  showCampScreen() {
    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = `CAMP (${this.campActionsLeft} actions left)`;

    // Build intro with camp log
    let introText = 'Your cohort finds a sheltered spot among the trees. The fire crackles low.';
    if (this.campLog.length > 0) {
      introText += '\n\n' + this.campLog.join('\n');
    }
    document.getElementById('event-intro').textContent = introText;
    document.getElementById('event-intro').style.whiteSpace = 'pre-line';

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';
    document.getElementById('event-outcome').classList.add('hidden');

    if (this.campActionsLeft <= 0) {
      // No actions left — show summary and continue
      document.getElementById('event-title').textContent = 'CAMP — DAWN BREAKS';
      document.getElementById('event-outcome').classList.remove('hidden');
      document.getElementById('event-outcome-text').textContent = 'Your soldiers pack up and prepare to march.';
      document.getElementById('btn-event-continue').onclick = () => {
        this.showMapScreen();
      };
      return;
    }

    const campActions = [
      {
        name: 'Tend Wounds',
        desc: 'Heal all soldiers for 15% max HP.',
        action: () => {
          this.engine.party.forEach(u => {
            if (!u.downed) {
              const amt = Math.floor(u.maxHp * 0.15);
              u.hp = Math.min(u.maxHp, u.hp + amt);
            }
          });
          this.campLog.push('Wounds were tended. (All healed 15% max HP)');
        }
      },
      {
        name: 'Rally the Men',
        desc: 'Restore 15 Morale.',
        action: () => {
          this.engine.morale = Math.min(100, this.engine.morale + 15);
          this.campLog.push('Words of courage by the fire. (+15 Morale)');
        }
      },
      {
        name: 'Sharpen Weapons',
        desc: 'All soldiers gain +1 damage for next 2 attacks in the next fight.',
        action: () => {
          this.engine.party.forEach(u => {
            if (!u.downed) u.buffs.push({ damage: 1, attacksLeft: 2 });
          });
          this.campLog.push('Blades sharpened to a fine edge. (+1 damage, 2 attacks)');
        }
      },
      {
        name: 'Fortify Position',
        desc: 'All soldiers start the next fight with 4 Block.',
        action: () => {
          this.engine.party.forEach(u => {
            if (!u.downed) u.block = (u.block || 0) + 4;
          });
          this.campLog.push('Makeshift barricades built. (+4 Block each)');
        }
      }
    ];

    campActions.forEach(ca => {
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<strong>${ca.name}</strong><br><span style="font-size:0.75rem;color:var(--text-dim)">${ca.desc}</span>`;
      btn.addEventListener('click', () => {
        ca.action();
        this.campActionsLeft--;
        this.updateMoodClass();
        this.showCampScreen();
      });
      choicesEl.appendChild(btn);
    });
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

    // Track stats
    if (window.game) window.game.trackEncounterStats();

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
            <span class="summary-unit-title" style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span>
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

    // Grant one skill pick after each combat encounter
    this.engine.grantSkillPick();

    // Roll drops — filter by usability and enforce rarity caps by threat
    const difficulty = window.game ? window.game.difficulty : 1;
    const allDrops = [];
    for (const enemyId of this.engine.killedEnemies) {
      const itemId = rollDrop(enemyId, this.engine.party);
      if (!itemId) continue;
      const item = getItemData(itemId);
      if (!item) continue;
      const canUse = this.engine.party.some(u => canEquipItem(u, item));
      if (canUse) allDrops.push(itemId);
    }

    // Rarity caps by threat: easy=1 uncommon, mid=2 uncommon, hard=2 uncommon + 1 rare
    const threat = this.currentNodeThreat || 1;
    let maxUncommon = 1, maxRare = 0;
    if (threat === 2) { maxUncommon = 2; maxRare = 0; }
    else if (threat >= 3) { maxUncommon = 2; maxRare = 1; }
    if (isBossVictory) { maxUncommon = 99; maxRare = 99; }

    let uncommonCount = 0, rareCount = 0;
    this.pendingLoot = [];
    for (const itemId of allDrops) {
      const item = getItemData(itemId);
      if (!item) continue;
      if (item.rarity === 'rare') {
        if (rareCount >= maxRare) continue;
        rareCount++;
      } else if (item.rarity === 'uncommon') {
        if (uncommonCount >= maxUncommon) continue;
        uncommonCount++;
      }
      // Scale item level by difficulty (difficulty 2 = +1 level, etc.)
      const bonusLevels = Math.max(0, difficulty - 1);
      const scaledId = bonusLevels > 0 ? createLeveledItem(itemId, bonusLevels) : itemId;
      this.pendingLoot.push(scaledId);
    }

    // Boss guaranteed rare drop if nothing dropped — filtered to usable items
    if (isBossVictory && this.pendingLoot.length === 0) {
      const usableBossItems = BOSS_DROP_POOL.filter(id => {
        const item = getItemData(id);
        return item && this.engine.party.some(u => canEquipItem(u, item));
      });
      if (usableBossItems.length > 0) {
        this.pendingLoot.push(usableBossItems[Math.floor(Math.random() * usableBossItems.length)]);
      } else {
        // No usable boss items — grant Renown instead
        this.engine.totalRenownEarned += 10;
        this.engine.addLog('No usable spoils found — +10 Renown instead.');
      }
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
            // Find lowest rarity + lowest level item that would be replaced
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
            const worstItem = getItemData(slots[worstIdx]);
            replaceText = worstItem ? `Replaces: ${worstItem.name}` : '';
          }
          return `<button class="loot-equip-btn" data-loot="${lootIdx}" data-unit="${u.index}">
            Equip <span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span>${replaceText ? `<span class="loot-replace">${replaceText}</span>` : ''}
          </button>`;
        }).join('');

        card.innerHTML = `
          <div class="loot-card-header">
            <span class="loot-item-name">${item.name}</span>
            <span class="loot-rarity">${item.rarity.toUpperCase()}${item.level > 1 ? ` Lv${item.level}` : ''}</span>
          </div>
          <div class="loot-item-meta">${item.slot} &middot; ${formatItemStats(item.stats)} <span class="loot-item-tags">${renderTagPips(item.classTags)}</span></div>
          <div class="loot-item-desc">${item.description}</div>
          ${item.special ? `<div class="loot-item-special">${item.special}</div>` : ''}
          <div class="loot-item-skip">Skip: +${{ common: 2, uncommon: 5, rare: 10 }[item.rarity] || 2} Renown</div>
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
      const skillCount = `${u.skills.length}/${u.allSkills.length} skills`;

      const slotHtml = ['weapon', 'armor', 'trinket'].map(slot => {
        const items = u.equipment[slot].map((id, si) => {
          const item = id ? getItemData(id) : null;
          return `<span class="equip-slot-item ${item ? 'rarity-' + item.rarity : 'empty'}" ${item ? `data-item-id="${id}"` : ''}>${item ? renderTagPips(item.classTags) + ' ' + item.name : '\u2014'}</span>`;
        }).join(', ');
        return `<div class="equip-slot-row">
          <span class="equip-slot-label">${slot} (${EQUIP_SLOTS[slot]})</span>
          ${items}
        </div>`;
      }).join('');

      return `<div class="equip-unit">
        <div class="equip-unit-header">
          <span class="equip-unit-name"><span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name}</span>
          <span class="equip-unit-xp">${skillCount}</span>
        </div>
        ${slotHtml}
      </div>`;
    }).join('');

    // Bind item tooltips on equipped items
    equipListEl.querySelectorAll('.equip-slot-item[data-item-id]').forEach(el => {
      const itemId = el.dataset.itemId;
      el.addEventListener('mouseenter', (e) => this.showItemTooltip(itemId, el));
      el.addEventListener('mouseleave', () => this.hideItemTooltip());
      let holdTimer = null;
      el.addEventListener('touchstart', () => {
        holdTimer = setTimeout(() => this.showItemTooltip(itemId, el), 300);
      }, { passive: true });
      el.addEventListener('touchend', () => { clearTimeout(holdTimer); this.hideItemTooltip(); });
      el.addEventListener('touchcancel', () => { clearTimeout(holdTimer); this.hideItemTooltip(); });
    });

    const afterLoot = () => {
      // Convert unpicked items to Renown
      if (this.pendingLoot.length > 0) {
        const renownPerRarity = { common: 2, uncommon: 5, rare: 10 };
        let bonusRenown = 0;
        this.pendingLoot.forEach(itemId => {
          const item = getItemData(itemId);
          if (item) bonusRenown += renownPerRarity[item.rarity] || 2;
        });
        this.engine.totalRenownEarned += bonusRenown;
        this.pendingLoot = [];
      }
      if (this.engine.pendingSkillPicks > 0) {
        this.showLevelUpScreen();
      } else if (this.lootScreenFinal) {
        this.showPostBossChoice();
      } else {
        this.showMapScreen();
      }
    };

    continueBtn.textContent = this.lootScreenFinal ? 'Continue' : 'Continue March';
    continueBtn.onclick = afterLoot;
  }

  showItemTooltip(itemId, el) {
    this.hideItemTooltip();
    const item = getItemData(itemId);
    if (!item) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'item-tooltip';
    tooltip.className = 'item-tooltip';
    tooltip.innerHTML = `
      <div class="item-tooltip-name rarity-${item.rarity}">${item.name}</div>
      <div class="item-tooltip-meta">${item.slot} &middot; ${item.rarity}${item.level > 1 ? ` Lv${item.level}` : ''} ${renderTagPips(item.classTags)}</div>
      <div class="item-tooltip-stats">${formatItemStats(item.stats)}</div>
      ${item.special ? `<div class="item-tooltip-special">${item.special}</div>` : ''}
      <div class="item-tooltip-desc">${item.description}</div>
    `;

    const rect = el.getBoundingClientRect();
    const gameRect = document.getElementById('game').getBoundingClientRect();
    tooltip.style.left = Math.max(4, rect.left - gameRect.left) + 'px';
    tooltip.style.bottom = (gameRect.bottom - rect.top + 4) + 'px';

    document.getElementById('loot-screen').appendChild(tooltip);
  }

  hideItemTooltip() {
    const existing = document.getElementById('item-tooltip');
    if (existing) existing.remove();
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

  // ================================================================
  // LEVEL UP
  // ================================================================

  showLevelUpScreen() {
    this.showScreen('levelup-screen');
    const content = document.getElementById('levelup-content');
    const title = document.getElementById('levelup-title');
    const desc = document.getElementById('levelup-desc');
    const MAX_SKILLS = 5;

    title.textContent = 'TRAINING';
    desc.textContent = 'Choose a soldier to train.';

    const alive = this.engine.party.filter(u => !u.downed);

    if (alive.length === 0) {
      this.engine.pendingSkillPicks = 0;
      this.afterLevelUps();
      return;
    }

    content.innerHTML = '';
    alive.forEach(u => {
      const canLearn = u.skills.length < MAX_SKILLS && this.engine.getUnlearnedSkills(u).length > 0;
      const btn = document.createElement('button');
      btn.className = 'btn-primary levelup-unit-btn';
      if (canLearn) {
        btn.innerHTML = `<span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name} (${u.skills.length}/${MAX_SKILLS} skills)`;
        btn.addEventListener('click', () => this.showSkillChoices(u.index));
      } else {
        btn.innerHTML = `<span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name} — Toughen Up (+3 HP)`;
        btn.addEventListener('click', () => {
          u.maxHp += 3;
          u.baseMaxHp += 3;
          u.hp += 3;
          this.engine.addLog(`${u.name} toughens up! (+3 max HP)`);
          this.engine.pendingSkillPicks--;
          if (this.engine.pendingSkillPicks > 0) {
            this.showLevelUpScreen();
          } else {
            this.afterLevelUps();
          }
        });
      }
      content.appendChild(btn);
    });
  }

  showSkillChoices(unitIndex) {
    const content = document.getElementById('levelup-content');
    const unit = this.engine.party[unitIndex];
    // Cache choices so Back button doesn't reroll
    if (!this._cachedSkillChoices || this._cachedSkillChoicesUnit !== unitIndex) {
      this._cachedSkillChoices = this.engine.getSkillChoices(unit, 2);
      this._cachedSkillChoicesUnit = unitIndex;
    }
    const choices = this._cachedSkillChoices;

    if (choices.length === 0) {
      this.showLevelUpScreen();
      return;
    }

    document.getElementById('levelup-desc').textContent = `${unit.name} — choose a new skill:`;

    content.innerHTML = '';
    choices.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'levelup-skill-card';
      card.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span></div>
        <div class="skill-desc">${skill.description}</div>
      `;
      card.addEventListener('click', () => {
        this._cachedSkillChoices = null;
        this._cachedSkillChoicesUnit = null;
        this.engine.teachSkill(unitIndex, skill.id);
        this.engine.pendingSkillPicks--;
        if (this.engine.pendingSkillPicks > 0) {
          this.showLevelUpScreen();
        } else {
          this.afterLevelUps();
        }
      });
      content.appendChild(card);
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.textContent = 'Back';
    backBtn.style.marginTop = '12px';
    backBtn.addEventListener('click', () => this.showLevelUpScreen());
    content.appendChild(backBtn);
  }

  afterLevelUps() {
    if (this.lootScreenFinal) {
      this.showPostBossChoice();
    } else {
      this.showMapScreen();
    }
  }

  showPostBossChoice() {
    if (window.game) window.game.trackRunEnd(true);
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
        <span class="run-complete-unit-name"><span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name}</span>
        <span class="run-complete-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp} HP`}</span>
        <span class="run-complete-unit-level">${u.skills.length} skills</span>
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
    if (window.game) window.game.trackRunEnd(false);
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
        <span class="run-complete-unit-name"><span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name}</span>
        <span class="run-complete-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp} HP`}</span>
        <span class="run-complete-unit-level">${u.skills.length} skills</span>
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
        <span style="color:var(--class-${getPrimaryTag(u.classId)})">${u.title}</span> ${u.name}: ${u.downed ? 'Fallen' : `${u.hp}/${u.maxHp} HP`}
      </div>`
    ).join('');

    const nextBtn = document.getElementById('btn-next');
    nextBtn.textContent = 'New March';
    nextBtn.onclick = () => window.game.startNewRun();
  }
}
