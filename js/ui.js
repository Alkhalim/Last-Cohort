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
      if (this.engine.morale >= 85) {
        effects = 'Inspired: +2 damage and +2 healing to all actions.';
      } else if (this.engine.morale >= 70) {
        effects = 'Confident: +1 damage and +1 healing to all actions.';
      } else if (this.engine.morale >= 55) {
        effects = 'Steady: Baseline performance. No modifiers.';
      } else if (this.engine.morale >= 40) {
        effects = 'Shaken: No major modifiers.';
      } else if (this.engine.morale >= 30) {
        effects = 'Distressed: -1 damage and -1 healing to all actions.';
      } else if (this.engine.morale >= 15) {
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
      case 'statusText':
        if (data.unitIndex !== undefined) {
          this.showStatusPopup(`unit-${data.unitIndex}`, data.text, data.color || 'var(--gold)');
        } else if (data.enemyIndex !== undefined) {
          this.showStatusPopup(`enemy-${data.enemyIndex}`, data.text, data.color || 'var(--gold)');
        }
        break;
      case 'enemyHit':
        this.flashElement(`enemy-${data.enemyIndex}`, 'hit', 400);
        this.showDamagePopup(`enemy-${data.enemyIndex}`, data.damage, 'damage');
        break;
      case 'skillCutIn':
        this.showSkillCutIn(data.classTitle, data.skillName);
        break;
      case 'enemyCutIn':
        this.showEnemyCutIn(data.enemyName, data.enemyId, data.actionName);
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

  // Skill cut-in portrait — slides in from left, holds, drifts out right
  showSkillCutIn(classTitle, skillName) {
    if (typeof isFastMode === 'function' && isFastMode()) return;
    const existing = document.getElementById('skill-cutin');
    if (existing) existing.remove();

    const cutin = document.createElement('div');
    cutin.id = 'skill-cutin';
    cutin.className = 'skill-cutin';
    cutin.innerHTML = `
      <img class="skill-cutin-portrait" src="${typeof getPlayerPortrait === 'function' ? getPlayerPortrait(classTitle) : 'assets/' + classTitle + '.png'}" alt="${classTitle}">
      <div class="skill-cutin-name">${skillName}</div>
    `;
    const combatScreen = document.getElementById('combat-screen');
    if (combatScreen) combatScreen.appendChild(cutin);
    else document.getElementById('game').appendChild(cutin);

    // Trigger animation
    requestAnimationFrame(() => cutin.classList.add('active'));

    // Remove after animation completes
    setTimeout(() => {
      cutin.classList.add('exit');
      setTimeout(() => cutin.remove(), 600);
    }, 1400);
  }

  // Enemy cut-in — portrait + name + action
  showEnemyCutIn(enemyName, enemyId, actionName) {
    if (typeof isFastMode === 'function' && isFastMode()) return;
    const existing = document.getElementById('enemy-cutin');
    if (existing) existing.remove();

    const portraitSrc = typeof getEnemyPortrait === 'function' ? getEnemyPortrait(enemyId) : `assets/enemy_${enemyId}.png`;
    const fallbackSrc = 'assets/enemy_portrait.png';

    const cutin = document.createElement('div');
    cutin.id = 'enemy-cutin';
    cutin.className = 'enemy-cutin';
    const img = document.createElement('img');
    img.className = 'enemy-cutin-portrait';
    img.alt = enemyName;
    img.src = portraitSrc;
    img.onerror = () => { img.src = fallbackSrc; };
    cutin.appendChild(img);
    if (actionName) {
      cutin.insertAdjacentHTML('beforeend', `<span class="enemy-cutin-name">${enemyName}</span><div class="enemy-cutin-action">${actionName}</div>`);
    } else {
      cutin.insertAdjacentHTML('beforeend', `<div class="enemy-cutin-action">${enemyName}</div>`);
    }
    const combatScreen = document.getElementById('combat-screen');
    if (combatScreen) combatScreen.appendChild(cutin);

    requestAnimationFrame(() => cutin.classList.add('active'));

    setTimeout(() => {
      cutin.classList.add('exit');
      setTimeout(() => cutin.remove(), 500);
    }, 1200);
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // Stop map sway when leaving map
    if (id !== 'map-screen') this._stopMapSway();
    // Clean up any stray tooltips
    this.hideUnitLootTooltip();
    this.hideEnemyTooltip();
  }

  // --- Main render ---
  render() {
    this.hideEnemyTooltip();
    // Victory/Defeat: render enemies one final time (so death animations show), then phase UI
    if (this.engine.phase === PHASE.VICTORY || this.engine.phase === PHASE.DEFEAT) {
      this.renderMorale();
      this.renderEnemies();
      this.renderPhaseUI();
      return;
    }
    this.renderMorale();
    this.renderBossHpBar();
    this.renderEnemies();
    this.renderDicePool();
    this.renderParty();
    this.renderPhaseUI();
    this.renderSkillPanel();
  }

  renderBossHpBar() {
    const bar = document.getElementById('boss-hp-bar');
    if (!bar) return;
    const boss = this.engine.enemies.find(e => e.isBoss && !e.dead);
    if (!boss) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    document.getElementById('boss-hp-name').textContent = boss.name;
    const pct = (boss.hp / boss.maxHp) * 100;
    const prevPct = this._prevBossHpPct !== undefined ? this._prevBossHpPct : pct;
    this._prevBossHpPct = pct;

    const fill = document.getElementById('boss-hp-fill');
    const drain = document.getElementById('boss-hp-drain');
    const text = document.getElementById('boss-hp-text');

    fill.style.width = pct + '%';
    drain.style.width = prevPct + '%';
    text.textContent = `${boss.hp} / ${boss.maxHp}`;

    // Color based on HP
    fill.className = 'boss-hp-fill' + (pct < 20 ? ' critical' : pct < 40 ? ' hp-low' : pct < 65 ? ' hp-mid' : '');

    // Animate drain
    if (prevPct > pct) {
      requestAnimationFrame(() => { drain.style.width = pct + '%'; });
    } else if (pct > prevPct) {
      drain.style.width = pct + '%';
    }

    // Enrage indicator
    if (boss.hp <= boss.maxHp * 0.5) {
      bar.classList.add('enraged');
    } else {
      bar.classList.remove('enraged');
    }
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
    const pct = this.engine.morale;
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
      el.className = `enemy-card${enemy.dead ? ' dead' : ''}${this.isEnemyTargetable(enemy) ? ' targetable' : ''}${this.isEnemyPreview(enemy) ? ' preview' : ''}${enemy.justSpawned ? ' spawning' : ''}${enemy.isBoss ? ' boss' : ''}${enemy.block > 0 ? ' has-block' : ''}${enemy.poison > 0 ? ' has-poison' : ''}`;
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
        <div class="hp-text">${enemy.hp}/${enemy.maxHp}${enemy.block > 0 ? ` <span class="block-icon">&#x1F6E1;${enemy.block}</span>` : ''}${enemy.poison > 0 ? ` <span class="poison-icon">&#x2620;${enemy.poison}</span>` : ''}</div>
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
      let desc = `<strong>${a.name}</strong>`;
      const details = [];
      if (a.damage > 0) details.push(`<span class="stat-dmg">${a.damage} dmg</span>`);
      if (a.poisonTarget) details.push(`<span class="stat-poison">${a.poisonTarget} poison</span>`);
      if (a.morale) details.push(`<span class="stat-morale-text">${a.morale} morale</span>`);
      if (a.blockAllEnemies) details.push(`<span class="stat-block">+${a.blockAllEnemies} block all</span>`);
      if (a.blockFrontRow) details.push(`<span class="stat-block">+${a.blockFrontRow} block front</span>`);
      if (a.blockSelf) details.push(`<span class="stat-block">+${a.blockSelf} block self</span>`);
      if (a.spawn) details.push('<span style="color:var(--gold)">spawns unit</span>');
      if (a.aoe) details.push('<span style="color:var(--red-bright)">AOE</span>');
      if (a.ignoreRow) details.push('<span style="color:var(--text-dim)">any row</span>');
      if (details.length > 0) desc += ` (${details.join(', ')})`;
      // Show flavor text for passive/structure abilities or when no mechanical details
      if (a.text && (details.length === 0 || enemy.isStructure)) {
        desc += `<div class="enemy-tooltip-action-text">${a.text}</div>`;
      }
      return `<div class="enemy-tooltip-action">${desc}</div>`;
    }).join('');

    const tags = [];
    if (enemy.isBoss) tags.push('<span class="enemy-tag tag-boss">BOSS</span>');
    if (enemy.isElite) tags.push('<span class="enemy-tag tag-elite">ELITE</span>');
    tags.push(`<span class="enemy-tag">${enemy.row} row</span>`);

    const portraitSrc = typeof getEnemyPortrait === 'function' ? getEnemyPortrait(enemy.id) : `assets/enemy_${enemy.id}.png`;
    const fallbackSrc = 'assets/enemy_portrait.png';

    tooltip.innerHTML = `
      <div class="enemy-tooltip-header">
        <img class="enemy-tooltip-portrait" src="${portraitSrc}" onerror="this.src='${fallbackSrc}'" alt="${enemy.name}">
        <div class="enemy-tooltip-header-text">
          <div class="enemy-tooltip-name">${enemy.name}</div>
          <div class="enemy-tooltip-tags">${tags.join(' ')}</div>
        </div>
      </div>
      <div class="enemy-tooltip-desc">${enemy.description || ''}</div>
      ${(() => {
        const passives = [];
        if (enemy.woundedDoubleAttack) passives.push('Passive: attacks twice when below 50% HP.');
        if (enemy.berserkRage) passives.push('Passive: deals bonus damage based on missing HP.');
        if (enemy.deathPoison) passives.push(`On death: applies ${enemy.deathPoison} Poison to all soldiers.`);
        if (enemy.deathDamageEnemy) passives.push(`On death: deals ${enemy.deathDamageEnemy} damage to nearby enemies.`);
        if (enemy.deathMoraleMultiplier) passives.push(`Killing this enemy restores ${enemy.deathMoraleMultiplier}x morale.`);
        if (enemy.aura && enemy.aura.damageReduction) passives.push(`Aura: nearby enemies take ${enemy.aura.damageReduction} less damage.`);
        if (enemy.turnDamageAll) passives.push(`Passive: deals ${enemy.turnDamageAll} damage to all soldiers each turn.`);
        if (enemy.healBoss) passives.push(`Passive: heals boss for ${enemy.healBoss} HP each turn.`);
        if (enemy.canSpawn) passives.push('Passive: can spawn copies of itself.');
        if (enemy.id === 'thusnelda') passives.push('Passive: gains Block per living ally each turn.');
        if (enemy._undyingRage) passives.push('Passive: attacks drain 5 Morale.');
        return passives.length > 0 ? `<div class="enemy-tooltip-passives">${passives.map(p => `<div class="enemy-tooltip-passive">${p}</div>`).join('')}</div>` : '';
      })()}
      ${(() => {
        const effects = [];
        if (enemy.poison > 0) effects.push(`<span class="status-poison">Poison ${enemy.poison}</span>`);
        if (enemy.block > 0) effects.push(`<span class="status-block">Block ${enemy.block}</span>`);
        if (enemy._marked && enemy._marked > 0) effects.push(`<span class="status-marked">Marked (${enemy._marked}t)</span>`);
        if (enemy._condemned && enemy._condemned > 0) effects.push(`<span class="status-condemned">Condemned (${enemy._condemned}t)</span>`);
        if (enemy._pinned) effects.push(`<span class="status-debuff">Pinned (-15% dmg)</span>`);
        if (enemy._suppressed && enemy._suppressed > 0) effects.push(`<span class="status-debuff">Suppressed (${enemy._suppressed})</span>`);
        if (enemy._crippled && enemy._crippled > 0) effects.push(`<span class="status-debuff">Crippled (${enemy._crippled})</span>`);
        if (enemy._deafened && enemy._deafened > 0) effects.push(`<span class="status-debuff">Deafened (${enemy._deafened}t)</span>`);
        if (enemy._skipNextAction) effects.push(`<span class="status-debuff">Stunned</span>`);
        if (enemy._snareTrap) effects.push(`<span class="status-debuff">Trapped (${enemy._snareTrap} dmg)</span>`);
        if (enemy._smokeScreen) effects.push(`<span class="status-debuff">Smoked (${Math.round(enemy._smokeScreen * 100)}% miss)</span>`);
        if (enemy._pendingSpawn) effects.push(`<span class="status-buff">Summoning next turn</span>`);
        return effects.length > 0 ? `<div class="enemy-tooltip-statuses">${effects.join(' ')}</div>` : '';
      })()}
      <div class="enemy-tooltip-actions-title">${enemy.isStructure ? 'Effects:' : 'Attacks:'}</div>
      ${actions}
    `;

    const rect = el.getBoundingClientRect();
    const gameRect = document.getElementById('game').getBoundingClientRect();
    tooltip.style.left = Math.max(4, rect.left - gameRect.left) + 'px';
    tooltip.style.top = (rect.bottom - gameRect.top + 4) + 'px';

    // Show target intent from pre-rolled data
    if (!enemy.dead && !enemy.isStructure && this.engine.phase === PHASE.PLAYER_TURN && enemy._intent) {
      const intent = enemy._intent;
      const alive = this.engine.party.filter(u => !u.downed);
      let intentText = '';
      let targetIndices = [];

      if (intent.type === 'stunned') {
        intentText = '<span style="color:var(--red-bright)">STUNNED — cannot act</span>';
      } else {
        const action = intent.action || {};
        const actionName = action.name || '?';
        // Validate target is still alive, re-pick if not
        let targetUnit = this.engine.party[intent.targetIndex];
        if (!targetUnit || targetUnit.downed) {
          targetUnit = alive[0]; // fallback
        }
        // Taunt override: show the taunting unit as the actual target
        const taunter = alive.find(u => u.taunt);
        if (taunter && !action.aoe && !(action.morale && !action.damage && action.morale < 0)) {
          targetUnit = taunter;
        }

        // Check if action targets self/allies rather than player party
        const isSelfBuff = !action.damage && !action.morale && (action.blockSelf || action.blockAllEnemies || action.blockFrontRow || action.spawn);
        const isMoraleOnly = !action.damage && action.morale && action.morale < 0 && !action.aoe;

        if (isSelfBuff) {
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--text-dim)">Self / Allies</span>`;
        } else if (intent.isAoe) {
          targetIndices = alive.map(u => u.index);
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--red-bright)">All soldiers</span>`;
        } else if (action.morale && !action.damage && action.morale < 0) {
          // Pure morale attack — affects whole party, not a single target
          targetIndices = alive.map(u => u.index);
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--red-bright)">All soldiers</span>`;
        } else if (intent.isTaunted) {
          targetIndices = [targetUnit.index];
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--red-bright)">${targetUnit.name}</span> (Taunted)`;
        } else if (intent.isSniper) {
          targetIndices = [targetUnit.index];
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--red-bright)">${targetUnit.name}</span> (Lowest HP)`;
        } else {
          targetIndices = [targetUnit.index];
          intentText = `<strong>${actionName}</strong> → <span style="color:var(--red-bright)">${targetUnit.name}</span>`;
        }
      }

      tooltip.innerHTML += `<div class="enemy-tooltip-intent">${intentText}</div>`;

      targetIndices.forEach(idx => {
        const unitEl = document.getElementById(`unit-${idx}`);
        if (unitEl) unitEl.classList.add('enemy-target-highlight');
      });
    }

    document.getElementById('combat-screen').appendChild(tooltip);
  }

  hideEnemyTooltip() {
    const existing = document.getElementById('enemy-tooltip');
    if (existing) existing.remove();
    // Clear target highlights
    document.querySelectorAll('.enemy-target-highlight').forEach(el => el.classList.remove('enemy-target-highlight'));
  }

  isEnemyTargetable(enemy) {
    if (enemy.dead) return false;
    if (this.engine.targetMode && (this.engine.targetMode.targetType === 'enemy' || this.engine.targetMode.targetType === 'dual_enemy')) {
      const tmUnit = this.engine.party[this.engine.targetMode.unitIndex];
      return this.engine.getValidEnemyTargets(this.engine.targetMode.skill, tmUnit).includes(enemy);
    }
    // Staged skill targeting
    if (this.stagedSkill && this.selectedUnitIndex !== null) {
      const unit = this.engine.party[this.selectedUnitIndex];
      if (!unit) return false;
      const skill = unit.skills.find(s => s.id === this.stagedSkill.skillId);
      if (!skill) return false;
      if (skill.target !== TARGET.SINGLE_ENEMY && skill.target !== TARGET.ALL_ENEMIES && skill.target !== TARGET.DUAL_ENEMY) return false;
      const canPay = this.engine.dicePool.canPayCost(skill.cost, this.stagedSkill.diceIds);
      if (!canPay) return false;
      if (skill.target === TARGET.ALL_ENEMIES) return true;
      return this.engine.getValidEnemyTargets(skill, unit).includes(enemy);
    }
    return false;
  }

  isEnemyPreview(enemy) {
    if (enemy.dead) return false;
    const skill = this.getPreviewSkill();
    if (!skill) return false;
    if (skill.target !== TARGET.SINGLE_ENEMY && skill.target !== TARGET.ALL_ENEMIES) return false;
    if (skill.target === TARGET.ALL_ENEMIES) return true;
    const unit = this.selectedUnitIndex !== null ? this.engine.party[this.selectedUnitIndex] : null;
    return this.engine.getValidEnemyTargets(skill, unit).includes(enemy);
  }

  onEnemyClick(enemy) {
    // Staged skill — click to confirm on this target
    if (this.stagedSkill) {
      this.onStagedTarget(enemy);
      return;
    }
    // Old engine targeting
    if (this.engine.targetMode && (this.engine.targetMode.targetType === 'enemy' || this.engine.targetMode.targetType === 'dual_enemy')) {
      this.engine.selectTarget(enemy);
    }
  }

  isAllyTargetable(unit) {
    // Revive targeting: only downed allies
    if (this.engine.targetMode && this.engine.targetMode.targetType === 'ally_downed') return unit.downed;
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
          up.addEventListener('click', (e) => {
            e.stopPropagation();
            if (up.disabled) return;
            up.disabled = true;
            this.engine.adjustDie(die.id, 1);
          });
          adjustContainer.appendChild(up);
        }
        if (die.value > 1) {
          const down = document.createElement('button');
          down.className = 'adjust-btn';
          down.textContent = '-';
          down.addEventListener('click', (e) => {
            e.stopPropagation();
            if (down.disabled) return;
            down.disabled = true;
            this.engine.adjustDie(die.id, -1);
          });
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

      const hpDelta = unit.hp - prevHp;

      if (unit.block > 0) el.classList.add('has-block');
      if (unit.poison > 0) el.classList.add('has-poison');
      const isStunned = unit._stunNextTurn || unit._stunnedThisTurn;
      if (isStunned) el.classList.add('stunned');

      el.innerHTML = `
        ${unit.block > 0 ? '<div class="unit-shield-overlay"></div>' : ''}
        ${unit.poison > 0 ? '<div class="unit-poison-overlay"></div>' : ''}
        ${isStunned ? '<div class="unit-stun-overlay">STUNNED</div>' : ''}
        <div class="unit-header">
          <span class="unit-title">${renderClassName(unit.classId, unit.title)}</span>
          <span class="unit-name">${unit.name}</span>
        </div>
        <div class="hp-bar-container">
          <div class="hp-bar">
            <div class="hp-drain" style="width:${drainPct}%"></div>
            <div class="hp-fill ${isHealing ? 'healing' : ''} ${hpPct < 20 ? 'critical' : hpPct < 40 ? 'hp-low' : hpPct < 65 ? 'hp-mid' : ''}" style="width:${fillStartPct}%"></div>
          </div>
          ${hpDelta !== 0 ? `<span class="hp-delta ${hpDelta > 0 ? 'hp-delta-heal' : 'hp-delta-damage'}">${hpDelta > 0 ? '+' + hpDelta : hpDelta}</span>` : ''}
        </div>
        <div class="unit-stats">
          <span class="hp-text">${unit.hp}/${unit.maxHp}</span>
          ${unit.block > 0 ? `<span class="block-icon" title="Block">&#x1F6E1;${unit.block}</span>` : ''}
          ${unit.poison > 0 ? `<span class="poison-icon" title="Poison">&#x2620;${unit.poison}</span>` : ''}
          ${unit.buffs && unit.buffs.length > 0 ? (() => { const totalDmg = unit.buffs.reduce((s, b) => s + (b.damage || 0), 0); const minAtk = Math.min(...unit.buffs.map(b => b.attacksLeft)); return `<span class="buff-text">+${totalDmg}\u2694(${minAtk})</span>`; })() : ''}
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
      } else if (this.engine.phase === PHASE.PRE_COMBAT && !unit.downed) {
        // Allow inspecting units before combat starts
        el.addEventListener('click', () => this.onUnitClick(i));
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
      // Delay showing button if a cut-in is still on screen
      const hasCutIn = document.getElementById('skill-cutin') || document.getElementById('enemy-cutin');
      if (hasCutIn) {
        endBtn.classList.add('hidden');
        setTimeout(() => this.render(), 800);
      } else {
        endBtn.classList.remove('hidden');
        endBtn.textContent = 'Continue';
        endBtn.onclick = () => this.onVictory();
      }
    } else if (this.engine.phase === PHASE.DEFEAT) {
      const hasCutIn = document.getElementById('skill-cutin') || document.getElementById('enemy-cutin');
      if (hasCutIn) {
        endBtn.classList.add('hidden');
        setTimeout(() => this.render(), 800);
      } else {
        endBtn.classList.remove('hidden');
        endBtn.textContent = 'Fall';
        endBtn.onclick = () => this.onDefeat();
      }
    } else {
      endBtn.classList.add('hidden');
      endBtn.textContent = 'End Turn';
    }

    const isPreCombat = this.engine.phase === PHASE.PRE_COMBAT;
    if (this.engine.phase !== PHASE.PLAYER_TURN && !isPreCombat) {
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

    // Before player turn, show all skills as inactive (no dice yet)
    const isPlayerTurn = this.engine.phase === PHASE.PLAYER_TURN;

    nameEl.textContent = `${unit.name}`;
    list.innerHTML = '';

    const skills = isPlayerTurn
      ? this.engine.getValidSkills(this.selectedUnitIndex)
      : unit.skills.map(s => ({ ...s, canUse: false }));

    // Compute equipment bonuses for modified descriptions
    const equipDmg = unit.equipDamage || 0;
    const equipBlock = unit.equipBlock || 0;
    const equipHeal = unit.equipHeal || 0;
    const equipPoison = unit.equipPoison || 0;
    const buffDmg = (unit.buffs || []).reduce((s, b) => s + (b.damage || 0), 0);
    let moraleMod = 0;
    if (this.engine.morale >= 85) moraleMod = 2;
    else if (this.engine.morale >= 70) moraleMod = 1;
    else if (this.engine.morale <= 15) moraleMod = -2;
    else if (this.engine.morale <= 30) moraleMod = -1;
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

      // Equites passive: Cavalry Charge — preview +50% on first attack
      const cavalryCharge = unit.classId === 'equites' && !unit.passiveTriggered;

      // Die-value scaling preview: show range based on cost type
      const dieRange = (costType) => {
        if (costType === 'odd') return [1, 3, 5];
        if (costType === 'even') return [2, 4, 6];
        const c = skill.cost;
        if (c && c.min && c.max) return Array.from({ length: c.max - c.min + 1 }, (_, i) => c.min + i);
        return [1, 2, 3, 4, 5, 6];
      };
      const costType = skill.cost && skill.cost.type;
      if (skill.effects && skill.effects.dieScaleDamage) {
        const dieScale = skill.effects.bonusDmgScale || (skill.effects.halfBonusDmg ? 0.5 : 1);
        const dieBonusDmg = dieScale !== 1 ? Math.floor(ownBonusDmg * dieScale) + buffDmg : effectiveBonusDmg;
        const baseDmg = skill.effects.damage || 0;
        const vals = dieRange(costType);
        // Build bonus breakdown string for die-scaling
        const dieBreakdown = () => {
          if (dieScale !== 1 && ownBonusDmg !== 0) {
            const parts = [`${ownBonusDmg}*${dieScale}`];
            if (buffDmg) parts.push(`${buffDmg}`);
            return '+' + parts.join('+');
          }
          return dieBonusDmg >= 0 ? `+${dieBonusDmg}` : `${dieBonusDmg}`;
        };
        // "X + die value damage" pattern — use effects.damage as base, not the text number
        desc = desc.replace(/(\d+) \+ die value damage/g, () => {
          const lo = Math.max(1, baseDmg + vals[0] + dieBonusDmg);
          const hi = Math.max(1, baseDmg + vals[vals.length - 1] + dieBonusDmg);
          if (dieBonusDmg !== 0) {
            return `<span class="stat-dmg">${lo}-${hi}</span> <span class="stat-breakdown">(${baseDmg}+die${dieBreakdown()})</span> damage`;
          }
          return `<span class="stat-dmg">${lo}-${hi}</span> damage`;
        });
        // "damage equal to die value" pattern
        desc = desc.replace(/damage equal to die value/g, () => {
          const lo = Math.max(1, baseDmg + vals[0] + dieBonusDmg);
          const hi = Math.max(1, baseDmg + vals[vals.length - 1] + dieBonusDmg);
          if (dieBonusDmg !== 0) {
            return `<span class="stat-dmg">${lo}-${hi}</span> <span class="stat-breakdown">(die${dieBreakdown()})</span> damage`;
          }
          return `<span class="stat-dmg">${lo}-${hi}</span> damage`;
        });
      }
      if (skill.effects && skill.effects.dieScaleBlock) {
        const baseBlock = skill.effects.block || 0;
        const vals = dieRange(costType);
        // "X + die value Block" — use effects.block as base
        desc = desc.replace(/(\d+) \+ die value Block/g, () => {
          const lo = baseBlock + vals[0] + equipBlock;
          const hi = baseBlock + vals[vals.length - 1] + equipBlock;
          if (equipBlock > 0) {
            return `<span class="stat-block">${lo}-${hi}</span> <span class="stat-breakdown">(${baseBlock}+die+${equipBlock})</span> Block`;
          }
          return `<span class="stat-block">${lo}-${hi}</span> Block`;
        });
        desc = desc.replace(/Block equal to die value/g, () => {
          const lo = baseBlock + vals[0] + equipBlock;
          const hi = baseBlock + vals[vals.length - 1] + equipBlock;
          if (equipBlock > 0) {
            return `<span class="stat-block">${lo}-${hi}</span> <span class="stat-breakdown">(die+${equipBlock})</span> Block`;
          }
          return `<span class="stat-block">${lo}-${hi}</span> Block`;
        });
      }
      if (skill.effects && skill.effects.dieScaleHeal) {
        const baseHeal = skill.effects.heal || 0;
        const vals = dieRange(costType);
        desc = desc.replace(/HP equal to die value/g, () => {
          const lo = Math.max(0, baseHeal + vals[0] + totalBonusHeal);
          const hi = Math.max(0, baseHeal + vals[vals.length - 1] + totalBonusHeal);
          if (totalBonusHeal !== 0) {
            return `<span class="stat-heal">${lo}-${hi}</span> <span class="stat-breakdown">(die${totalBonusHeal >= 0 ? '+' : ''}${totalBonusHeal})</span> HP`;
          }
          return `<span class="stat-heal">${lo}-${hi}</span> HP`;
        });
      }

      // Replace "Deals/Deal X damage" — these are actual attacks that get equipment bonuses
      // Bonus damage scaling: only scales own equip+morale, buff damage always full
      const dmgScale = (skill.effects && skill.effects.bonusDmgScale) || (skill.effects && skill.effects.halfBonusDmg ? 0.5 : 1);
      const ownBonusDmg = equipDmg + moraleMod - auraReduction;
      const skillBonusDmg = dmgScale !== 1 ? Math.floor(ownBonusDmg * dmgScale) + buffDmg : effectiveBonusDmg;
      desc = desc.replace(/([Dd]eal[s]?) (\d+) damage/g, (match, verb, base) => {
        const b = parseInt(base);
        const chargeBonus = cavalryCharge ? Math.floor(b * 0.5) : 0;
        const totalBonus = skillBonusDmg + chargeBonus;
        if (totalBonus !== 0) {
          const total = Math.max(1, b + totalBonus);
          // Show scaling formula when modifier isn't 1x
          let breakdownStr;
          if (dmgScale !== 1 && ownBonusDmg !== 0) {
            const scaledOwn = Math.floor(ownBonusDmg * dmgScale);
            const parts = [`${b}`, `${ownBonusDmg}*${dmgScale}`];
            if (buffDmg) parts.push(`${buffDmg}`);
            if (chargeBonus) parts.push(`${chargeBonus}`);
            breakdownStr = parts.join('+');
          } else {
            breakdownStr = `${b}+${totalBonus}`;
          }
          return `${verb} <span class="stat-dmg">${total}</span> <span class="stat-breakdown">(${breakdownStr})</span> damage`;
        }
        return `${verb} <span class="stat-dmg">${b}</span> damage`;
      });
      // Buff damage preview: scale "+X damage" with half of caster's equipDamage
      const halfEquipDmg = Math.floor(equipDmg / 2);
      if (skill.effects && (skill.effects.buffAllies || skill.effects.buffSelf) && halfEquipDmg > 0) {
        desc = desc.replace(/\+(\d+) damage/g, (match, base) => {
          const b = parseInt(base);
          const total = b + halfEquipDmg;
          return `+<span class="stat-dmg">${total}</span> <span class="stat-breakdown">(${b}+${halfEquipDmg})</span> damage`;
        });
      }
      // Color-code remaining "X damage" (that hasn't been wrapped in spans already)
      desc = desc.replace(/(?<!">)(\d+) damage/g, '<span class="stat-dmg">$1</span> damage');

      // Replace block values
      desc = desc.replace(/(\d+) Block/g, (match, base) => {
        const b = parseInt(base);
        if (equipBlock > 0) {
          const total = b + equipBlock;
          return `<span class="stat-block">${total}</span> <span class="stat-breakdown">(${b}+${equipBlock})</span> Block`;
        }
        return `<span class="stat-block">${b}</span> Block`;
      });

      // Replace heal values
      desc = desc.replace(/(\d+) HP/g, (match, base) => {
        const b = parseInt(base);
        if (totalBonusHeal !== 0) {
          const total = Math.max(0, b + totalBonusHeal);
          return `<span class="stat-heal">${total}</span> <span class="stat-breakdown">(${b}${totalBonusHeal >= 0 ? '+' : ''}${totalBonusHeal})</span> HP`;
        }
        return `<span class="stat-heal">${b}</span> HP`;
      });

      // Replace "pair value" with actual value when dice are staged
      if (skill.cost && skill.cost.type === 'pair') {
        let pairVal = null;
        if (isStaged && this.stagedSkill.diceIds.length >= 2) {
          const stagedDice = this.stagedSkill.diceIds.map(id => this.engine.dicePool.dice.find(d => d.id === id)).filter(Boolean);
          if (stagedDice.length >= 2 && stagedDice[0].value === stagedDice[1].value) {
            pairVal = stagedDice[0].value;
          }
        }
        if (pairVal !== null) {
          // Replace "pair value" with the actual number, color-coded
          desc = desc.replace(/pair value x(\d+)/g, (m, mult) => `<span class="stat-block">${pairVal * parseInt(mult)}</span> <span class="stat-breakdown">(${pairVal}×${mult})</span>`);
          desc = desc.replace(/pair value/g, `<span class="stat-block">${pairVal}</span>`);
        } else {
          // Show range: 1-6 for pair value
          desc = desc.replace(/pair value x(\d+)/g, (m, mult) => `<span class="stat-block">${mult}-${6 * parseInt(mult)}</span>`);
          desc = desc.replace(/pair value/g, `<span class="stat-block">1-6</span>`);
        }
      }

      // Replace "die value" with actual value when dice are staged (non-scaling contexts)
      if (isStaged && this.stagedSkill.diceIds.length >= 1) {
        const stagedDie = this.engine.dicePool.dice.find(d => d.id === this.stagedSkill.diceIds[0]);
        if (stagedDie) {
          desc = desc.replace(/die value x(\d+)/g, (m, mult) => `<span class="stat-block">${stagedDie.value * parseInt(mult)}</span> <span class="stat-breakdown">(${stagedDie.value}×${mult})</span>`);
        }
      }

      // Replace "higher die"/"lower die" with actual values when consecutive dice are staged
      if (isStaged && this.stagedSkill.diceIds.length >= 2) {
        const d1 = this.engine.dicePool.dice.find(d => d.id === this.stagedSkill.diceIds[0]);
        const d2 = this.engine.dicePool.dice.find(d => d.id === this.stagedSkill.diceIds[1]);
        if (d1 && d2) {
          const hi = Math.max(d1.value, d2.value);
          const lo = Math.min(d1.value, d2.value);
          const hiWithBonus = hi + effectiveBonusDmg;
          const loWithBlock = lo + equipBlock;
          desc = desc.replace(/damage equal to the higher die/g,
            `<span class="stat-dmg">${Math.max(1, hiWithBonus)}</span>${effectiveBonusDmg !== 0 ? ` <span class="stat-breakdown">(${hi}${effectiveBonusDmg >= 0 ? '+' : ''}${effectiveBonusDmg})</span>` : ''} damage`);
          desc = desc.replace(/Block equal to the lower die/g,
            `<span class="stat-block">${loWithBlock}</span>${equipBlock > 0 ? ` <span class="stat-breakdown">(${lo}+${equipBlock})</span>` : ''} Block`);
        }
      } else if (skill.effects && skill.effects.precisionDrill) {
        // Not staged yet — show ranges
        desc = desc.replace(/damage equal to the higher die/g, `<span class="stat-dmg">2-6</span>${effectiveBonusDmg !== 0 ? ` <span class="stat-breakdown">(die${effectiveBonusDmg >= 0 ? '+' : ''}${effectiveBonusDmg})</span>` : ''} damage`);
        desc = desc.replace(/Block equal to the lower die/g, `<span class="stat-block">1-5</span>${equipBlock > 0 ? ` <span class="stat-breakdown">(die+${equipBlock})</span>` : ''} Block`);
      }

      // Replace poison values
      desc = desc.replace(/(\d+) Poison/g, (match, base) => {
        const b = parseInt(base);
        if (equipPoison > 0) {
          const total = b + equipPoison;
          return `<span class="stat-poison">${total}</span> <span class="stat-breakdown">(${b}+${equipPoison})</span> Poison`;
        }
        return `<span class="stat-poison">${b}</span> Poison`;
      });
      desc = desc.replace(/(\d+) Morale/g, '<span class="stat-morale-text">$1</span> Morale');

      const cdLeft = skill.cooldownLeft > 0 ? skill.cooldownLeft - 1 : 0;
      let cdText = '';
      if (skill.cooldown && !skill.cooldownLeft) {
        const icons = Array.from({ length: skill.cooldown }, () => '<span class="cd-icon ready"></span>').join('');
        cdText = `<span class="skill-cd-ready">${icons}</span>`;
      }
      const onCooldown = skill.cooldownLeft > 0 && cdLeft > 0;
      const readyNextTurn = skill.cooldownLeft > 0 && cdLeft === 0;
      let cooldownOverlay = '';
      if (onCooldown) {
        el.classList.add('on-cooldown');
        cooldownOverlay = `<div class="skill-cooldown-overlay">Ready in ${cdLeft} turn${cdLeft > 1 ? 's' : ''}</div>`;
      } else if (readyNextTurn) {
        el.classList.add('on-cooldown', 'ready-soon');
        cooldownOverlay = `<div class="skill-cooldown-overlay ready">Ready next turn</div>`;
      }
      el.innerHTML = `
        <div class="skill-name">${skill.name} <span class="skill-cost">[${skill.cost.label}]</span> ${cdText}</div>
        <div class="skill-desc">${desc}</div>
        ${cooldownOverlay}
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
      } else if (skill.cooldownLeft && skill.cooldownLeft > 0) {
        el.addEventListener('click', () => this.showCooldownPopup(el, skill.cooldownLeft));
      }

      list.appendChild(el);
    });

    confirmBtn.classList.add('hidden');
  }

  showUnitLootTooltip(unitIndex, el) {
    this.hideUnitLootTooltip();
    const u = this.engine.party[unitIndex];
    if (!u) return;
    const tag = getPrimaryTag(u.classId);
    const classData = CLASS_DATA[u.classId];
    const passiveHtml = classData && classData.passive
      ? `<div class="ult-passive"><strong>${classData.passive.name}:</strong> ${classData.passive.description}</div>`
      : '';
    const skillsHtml = u.skills.map(s => {
      const cdText = s.cooldown ? ` <span style="color:var(--text-dim)">[CD ${s.cooldown}]</span>` : '';
      return `<div class="ult-skill">${s.name}${cdText}</div>`;
    }).join('');
    const equipHtml = ['weapon', 'armor', 'trinket'].flatMap(slot =>
      u.equipment[slot].filter(Boolean).map(id => {
        const it = getItemData(id);
        if (!it) return '';
        return `<div class="ult-item"><span class="rarity-${it.rarity}">${it.name}</span> <span style="color:var(--text-dim);font-size:0.6rem">${formatItemStats(it.stats)}</span></div>`;
      }).filter(Boolean)
    ).join('') || '<span style="color:var(--text-dim)">No equipment</span>';

    const tooltip = document.createElement('div');
    tooltip.id = 'unit-loot-tooltip';
    tooltip.className = 'unit-loot-tooltip';
    tooltip.innerHTML = `
      <div class="ult-header"><span style="color:var(--class-${tag})">${u.title}</span> ${u.name} <span style="color:var(--text-dim)">${u.hp}/${u.maxHp} HP</span></div>
      ${passiveHtml}
      <div class="ult-section-title">Skills</div>
      ${skillsHtml}
      <div class="ult-section-title">Equipment</div>
      ${equipHtml}
    `;
    const rect = el.getBoundingClientRect();
    tooltip.style.left = Math.max(4, rect.left) + 'px';
    tooltip.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    document.body.appendChild(tooltip);
  }

  hideUnitLootTooltip() {
    const existing = document.getElementById('unit-loot-tooltip');
    if (existing) existing.remove();
  }

  showCooldownPopup(element, turnsLeft) {
    const popup = document.createElement('div');
    popup.className = 'cooldown-popup';
    const displayLeft = Math.max(0, turnsLeft - 1);
    popup.textContent = displayLeft > 0
      ? `On cooldown (${displayLeft} turn${displayLeft > 1 ? 's' : ''} remaining)`
      : 'Ready next turn';
    const rect = element.getBoundingClientRect();
    popup.style.left = (rect.left + rect.width / 2) + 'px';
    popup.style.top = (rect.top - 8) + 'px';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
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

    // For self/all-target skills and dual-target skills, route through beginSkillTarget
    if (skill.target === TARGET.SELF || skill.target === TARGET.ALL_ALLIES || skill.target === TARGET.ALL_ENEMIES || skill.target === TARGET.DUAL_ENEMY) {
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
        phaseLabel.textContent = this.engine.isAmbush ? 'AMBUSH' : 'ENCOUNTER';
        if (!this.engine.isAmbush) {
          rollBtn.classList.remove('hidden');
          rollBtn.textContent = 'Begin Encounter';
          rollBtn.onclick = () => { this.engine.beginSpawning(); };
        }
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
        if (this.engine.targetMode && this.engine.targetMode.targetType === 'dual_enemy') {
          const picked = this.engine.targetMode.selectedTargets ? this.engine.targetMode.selectedTargets.length : 0;
          phaseLabel.textContent = `SELECT TARGET ${picked + 1} OF 2 FOR ${this.engine.targetMode.skill.name.toUpperCase()}`;
        } else if (this.engine.targetMode) {
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

  showStatusPopup(elementId, text, color) {
    const target = document.getElementById(elementId);
    if (!target) return;
    const popup = document.createElement('div');
    popup.className = 'status-popup';
    popup.textContent = text;
    popup.style.color = color || 'var(--gold)';
    const rect = target.getBoundingClientRect();
    popup.style.left = (rect.left + rect.width / 2) + 'px';
    popup.style.top = (rect.top - 4) + 'px';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1400);
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
    this._startMapSway();
    if (window.game && window.game.musicMode === 'boss') {
      window.game.resumeGameplayMusic();
    }
    // Auto-save at map screen
    if (window.game && window.game.saveRun) window.game.saveRun();
  }

  _startMapSway() {
    if (this._mapSwayActive) return;
    this._mapSwayActive = true;
    this._mapAnimTime = 0;
    const tick = () => {
      if (!this._mapSwayActive) return;
      this._mapAnimTime += 0.016;
      // Only redraw terrain every ~2 seconds for performance
      if (Math.floor(this._mapAnimTime * 0.5) !== Math.floor((this._mapAnimTime - 0.016) * 0.5)) {
        this.renderMap();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _stopMapSway() {
    this._mapSwayActive = false;
  }

  renderMapPartyBar() {
    const bar = document.getElementById('map-party-bar');
    bar.innerHTML = this.engine.party.map((u, i) => {
      const pct = (u.hp / u.maxHp) * 100;
      return `<div class="map-party-unit${u.downed ? ' downed' : ''}" data-unit-idx="${i}">
        <span class="map-party-name">${renderClassName(u.classId, u.title)}</span>
        <div class="map-party-hp-bar">
          <div class="map-party-hp-fill${pct < 20 ? ' critical' : pct < 40 ? ' hp-low' : pct < 65 ? ' hp-mid' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="map-party-hp-text">${u.hp}/${u.maxHp}</span>
      </div>`;
    }).join('');

    // Bind click to show character profile
    bar.querySelectorAll('.map-party-unit').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.unitIdx);
        this.showCharacterProfile(idx);
      });
    });
  }

  showCharacterProfile(unitIndex) {
    const unit = this.engine.party[unitIndex];
    const tag = getPrimaryTag(unit.classId);
    const classData = CLASS_DATA[unit.classId];

    // Passive
    const passiveHtml = unit.passive && unit.passive.name
      ? `<div class="profile-passive"><span class="profile-label">Passive:</span> <span class="profile-passive-name">${unit.passive.name}</span> — ${unit.passive.description}</div>`
      : '';

    // Bonus stats from training/events
    const bonuses = [];
    if (unit.bonusDamage) bonuses.push(`<span style="color:var(--red-bright)">+${unit.bonusDamage} dmg</span>`);
    if (unit.bonusBlock) bonuses.push(`<span style="color:var(--blue-bright)">+${unit.bonusBlock} block</span>`);
    if (unit.bonusHeal) bonuses.push(`<span style="color:var(--green-bright)">+${unit.bonusHeal} heal</span>`);
    if (unit.bonusPoison) bonuses.push(`<span style="color:#8a4">+${unit.bonusPoison} poison</span>`);
    const bonusHtml = bonuses.length > 0
      ? `<div class="profile-bonuses"><span class="profile-label">Training:</span> ${bonuses.join(' ')}</div>`
      : '';

    // Equipment totals
    const equipTotals = this._buildEquipTotals(unit);

    // Equipment list
    const equipHtml = ['weapon', 'armor', 'trinket'].map(slot => {
      const items = unit.equipment[slot].filter(Boolean).map(id => {
        const item = getItemData(id);
        if (!item) return '';
        return `<div class="profile-item rarity-${item.rarity}"><span class="profile-item-name">${item.name}${item.level > 1 ? ` Lv${item.level}` : ''}</span> <span class="profile-item-stats">${formatItemStats(item.stats)}</span>${item.special ? `<div class="profile-item-special">${item.special}</div>` : ''}</div>`;
      }).filter(Boolean).join('');
      return items || '';
    }).join('');

    // Skills
    const skillsHtml = unit.skills.map(s =>
      `<div class="profile-skill"><span class="profile-skill-name">${s.name}</span> <span class="profile-skill-cost">[${s.cost.label}]</span>${s.cooldown ? ` <span class="profile-skill-cd">CD:${s.cooldown}</span>` : ''}<div class="profile-skill-desc">${s.description}</div></div>`
    ).join('');

    // Build overlay
    const hpPct = Math.round((unit.hp / unit.maxHp) * 100);
    const hpColor = unit.downed ? 'var(--text-dim)' : hpPct > 60 ? 'var(--green-bright)' : hpPct > 30 ? 'var(--gold)' : 'var(--red-bright)';

    // Remove existing profile
    const existing = document.getElementById('character-profile');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'character-profile';
    overlay.innerHTML = `
      <div class="profile-backdrop"></div>
      <div class="profile-panel">
        <div class="profile-header">
          <span class="profile-name">${renderClassName(unit.classId, unit.title)} ${unit.name}</span>
          <span class="profile-hp" style="color:${hpColor}">${unit.downed ? 'DOWNED' : `${unit.hp}/${unit.maxHp} HP`}</span>
          <span class="profile-class-desc">${classData.description}</span>
        </div>
        ${passiveHtml}
        <div class="profile-equip-totals"><span class="profile-label">Equipment:</span> ${equipTotals}</div>
        ${bonusHtml}
        <div class="profile-section-title">Items</div>
        <div class="profile-items">${equipHtml || '<span class="profile-none">No equipment</span>'}</div>
        <div class="profile-section-title">Skills (${unit.skills.length})</div>
        <div class="profile-skills">${skillsHtml}</div>
        <button class="btn-secondary profile-close">Close</button>
      </div>
    `;

    document.getElementById('map-screen').appendChild(overlay);
    overlay.querySelector('.profile-backdrop').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.profile-close').addEventListener('click', () => overlay.remove());
  }

  renderMapMorale() {
    const title = document.getElementById('map-title');
    const diff = this.difficulty || 1;
    const theme = typeof MARCH_THEMES !== 'undefined' && MARCH_THEMES[diff];
    if (theme) {
      title.textContent = theme.name.toUpperCase();
    } else {
      title.textContent = 'TEUTOBURG FOREST';
    }

    const label = document.getElementById('map-morale-label');
    const band = getMoraleBand(this.engine.morale);
    label.textContent = `${band.label} (${this.engine.morale})`;
    label.style.color = band.color;

    // Bind morale tooltip on map label
    if (!label._moraleTooltipBound) {
      label._moraleTooltipBound = true;
      const showTip = () => {
        let effects = '';
        const m = this.engine.morale;
        if (m >= 85) effects = 'Inspired: +2 damage and +2 healing to all actions.';
        else if (m >= 70) effects = 'Confident: +1 damage and +1 healing to all actions.';
        else if (m >= 55) effects = 'Steady: No modifiers.';
        else if (m >= 40) effects = 'Shaken: No major modifiers.';
        else if (m >= 30) effects = 'Distressed: -1 damage and -1 healing to all actions.';
        else if (m >= 15) effects = 'Wavering: -1 damage and -1 healing to all actions.';
        else effects = 'Broken: -2 damage and -2 healing to all actions.';
        label.title = effects;
      };
      label.addEventListener('mouseenter', showTip);
      label.addEventListener('touchstart', showTip, { passive: true });
      label.style.cursor = 'help';
    }

    // Update mood class on #game for map/event/summary screens too
    this.updateMoodClass();
  }

  updateMoodClass() {
    const gameEl = document.getElementById('game');
    if (!gameEl) return;
    const morale = this.engine.morale;
    gameEl.classList.remove('mood-inspired', 'mood-steady', 'mood-shaken', 'mood-distressed', 'mood-broken');
    if (morale >= 85) gameEl.classList.add('mood-inspired');
    else if (morale >= 55) gameEl.classList.add('mood-steady');
    else if (morale >= 30) gameEl.classList.add('mood-shaken');
    else if (morale >= 15) gameEl.classList.add('mood-distressed');
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
    const nodeSpacing = 110;
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
    const visibleRange = 3;

    // Compute all nodes reachable via forward paths from current position
    const futureReachable = new Set();
    const computeFuture = (nodeId) => {
      if (futureReachable.has(nodeId)) return;
      futureReachable.add(nodeId);
      const n = this.mapNodes.find(nd => nd.id === nodeId);
      if (n) n.children.forEach(cid => computeFuture(cid));
    };
    if (this.currentNodeId !== null) {
      computeFuture(this.currentNodeId);
    } else {
      // Start: all depth-0 nodes and their descendants
      this.mapNodes.filter(n => n.depth === 0).forEach(n => computeFuture(n.id));
    }

    // Build set of visited node IDs for path drawing
    const visitedIds = new Set(this.mapNodes.filter(n => n.visited).map(n => n.id));

    // Position nodes
    const nodePositions = {};
    for (const node of this.mapNodes) {
      const y = totalHeight - bottomPadding - node.depth * nodeSpacing;
      const x = node.x * (wrapperWidth - 40) + 20;
      nodePositions[node.id] = { x, y };
    }

    // Helper: is a node visible
    const isVisible = (node) => node.visited || (node.depth >= currentDepth && node.depth <= currentDepth + visibleRange);

    // Draw lines on canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw terrain decorations based on march theme
    const marchTheme = (typeof MARCH_THEMES !== 'undefined' && MARCH_THEMES[this.difficulty]) ? MARCH_THEMES[this.difficulty].theme : 'forest';
    const terrainSeed = this._mapTerrainSeed || ((this.difficulty || 1) * 7919);
    const tRand = (i) => { let x = Math.sin(terrainSeed + i * 127.1) * 43758.5453; return x - Math.floor(x); };
    const margin = 20;
    const tX = (i) => margin + tRand(i) * (wrapperWidth - margin * 2);
    const tY = (i) => margin + tRand(i) * (totalHeight - margin * 2);

    // Collect path segments and node positions for collision avoidance
    const pathSegments = [];
    for (const node of this.mapNodes) {
      if (!isVisible(node)) continue;
      const from = nodePositions[node.id];
      for (const childId of node.children) {
        const childNode = this.mapNodes.find(n => n.id === childId);
        if (!childNode || !isVisible(childNode)) continue;
        const to = nodePositions[childId];
        if (to) pathSegments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      }
    }
    const nodePoints = Object.values(nodePositions);

    // Check if a point is too close to any path or node
    const nearPath = (px, py, minDist) => {
      for (const seg of pathSegments) {
        const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2));
        const cx = seg.x1 + t * dx, cy = seg.y1 + t * dy;
        const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
        if (dist < minDist) return true;
      }
      for (const np of nodePoints) {
        const dist = Math.sqrt((px - np.x) * (px - np.x) + (py - np.y) * (py - np.y));
        if (dist < minDist + 20) return true;
      }
      return false;
    };

    // Isometric helper: squash Y for top-down perspective, narrow X to compensate
    const isoTransform = (ctx, x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.75, 0.6);
      ctx.translate(-x, -y);
    };

    // Layer 1: Ground patches — irregular organic blobs using bezier curves
    const patchCount = 12 + Math.floor(tRand(800) * 6);
    const patchColors = {
      'forest': '#2a5a20', 'forest-dark': '#1a4a18', 'warcamp': '#4a3820',
      'bog': '#1a4a3a', 'ancient': '#3a5a18', 'blood': '#4a1818',
      'haunted': '#2a2a40', 'drowned': '#1a3a4a', 'heart': '#5a2a10', 'threshold': '#3a1a4a',
    };
    for (let i = 0; i < patchCount; i++) {
      const px = tX(i * 7 + 100);
      const py = tY(i * 7 + 101);
      const pr = 25 + tRand(i * 7 + 102) * 55;
      ctx.globalAlpha = 0.05 + tRand(i * 7 + 103) * 0.07;
      ctx.fillStyle = patchColors[marchTheme] || '#2a3a20';
      // Draw organic blob using bezier curves (no sharp angles)
      ctx.beginPath();
      const points = 6 + Math.floor(tRand(i * 7 + 110) * 3);
      for (let p = 0; p <= points; p++) {
        const angle = (p / points) * Math.PI * 2;
        const wobble = 0.7 + tRand(i * 13 + p * 7) * 0.6;
        const bx = px + Math.cos(angle) * pr * wobble;
        const by = py + Math.sin(angle) * pr * wobble;
        if (p === 0) { ctx.moveTo(bx, by); }
        else {
          const prevAngle = ((p - 0.5) / points) * Math.PI * 2;
          const cpWobble = 0.7 + tRand(i * 17 + p * 11) * 0.6;
          const cpx = px + Math.cos(prevAngle) * pr * cpWobble * 1.1;
          const cpy = py + Math.sin(prevAngle) * pr * cpWobble * 1.1;
          ctx.quadraticCurveTo(cpx, cpy, bx, by);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Layer 1b: Tiny scatter details (grass tufts, pebbles, leaf litter)
    const scatterCount = 25 + Math.floor(tRand(850) * 15);
    const scatterColors = {
      'forest': '#3a6a2a', 'forest-dark': '#2a5a1a', 'warcamp': '#5a4a30',
      'bog': '#2a5a3a', 'ancient': '#4a6a20', 'blood': '#5a2020',
      'haunted': '#3a3a50', 'drowned': '#2a4a5a', 'heart': '#6a3a18', 'threshold': '#4a2a5a',
    };
    for (let i = 0; i < scatterCount; i++) {
      const sx = tX(i * 11 + 500);
      const sy = tY(i * 11 + 501);
      if (nearPath(sx, sy, 15)) continue;
      ctx.globalAlpha = 0.08 + tRand(i * 11 + 502) * 0.08;
      ctx.fillStyle = scatterColors[marchTheme] || '#3a5a20';
      const kind = tRand(i * 11 + 503);
      if (kind < 0.4) {
        // Grass tuft
        ctx.strokeStyle = scatterColors[marchTheme] || '#3a5a20';
        ctx.lineWidth = 1;
        for (let g = 0; g < 3; g++) {
          const gx = sx + (tRand(i * 11 + g * 3 + 510) - 0.5) * 6;
          ctx.beginPath();
          ctx.moveTo(gx, sy);
          ctx.quadraticCurveTo(gx + (tRand(i * 11 + g * 3 + 511) - 0.5) * 4, sy - 4 - tRand(i * 11 + g * 3 + 512) * 4, gx + (tRand(i * 11 + g * 3 + 513) - 0.5) * 3, sy - 6 - tRand(i * 11 + g * 3 + 514) * 5);
          ctx.stroke();
        }
      } else if (kind < 0.7) {
        // Pebble cluster
        for (let p = 0; p < 2; p++) {
          ctx.beginPath();
          ctx.ellipse(sx + (tRand(i * 11 + p * 5 + 520) - 0.5) * 5, sy + (tRand(i * 11 + p * 5 + 521) - 0.5) * 3, 1.5 + tRand(i * 11 + p * 5 + 522) * 1.5, 1 + tRand(i * 11 + p * 5 + 523) * 1, tRand(i * 11 + p * 5 + 524) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Leaf / debris spot
        ctx.beginPath();
        ctx.ellipse(sx, sy, 2 + tRand(i * 11 + 530) * 3, 1.5 + tRand(i * 11 + 531) * 2, tRand(i * 11 + 532) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layer 2: Rivers/streams (for bog, drowned, ancient, heart)
    const hasWater = ['bog', 'drowned', 'ancient', 'heart'].includes(marchTheme);
    if (hasWater) {
      const riverCount = marchTheme === 'drowned' ? 2 : 1;
      for (let r = 0; r < riverCount; r++) {
        ctx.globalAlpha = marchTheme === 'drowned' ? 0.12 : 0.08;
        ctx.strokeStyle = marchTheme === 'heart' ? '#6a3020' : '#3a7a8a';
        ctx.lineWidth = 4 + tRand(r * 50 + 200) * 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let rx = margin + tRand(r * 50 + 201) * (wrapperWidth - margin * 2);
        let ry = margin;
        ctx.moveTo(rx, ry);
        for (let s = 0; s < 8; s++) {
          const nx = rx + (tRand(r * 50 + s * 11 + 210) - 0.5) * 80;
          ry += totalHeight / 8;
          const cpx = rx + (tRand(r * 50 + s * 11 + 215) - 0.5) * 60;
          ctx.quadraticCurveTo(Math.max(margin, Math.min(wrapperWidth - margin, cpx)), ry - totalHeight / 16, Math.max(margin, Math.min(wrapperWidth - margin, nx)), Math.min(totalHeight - margin, ry));
          rx = Math.max(margin, Math.min(wrapperWidth - margin, nx));
        }
        ctx.stroke();
      }
    }

    // Layer 3: Detail decorations — high density, avoid paths
    const decoCount = 55 + Math.floor(tRand(999) * 24);
    for (let i = 0; i < decoCount; i++) {
      const tx = tX(i * 3);
      const ty = tY(i * 3 + 1);
      const size = 5 + tRand(i * 3 + 2) * 10;

      // Skip decorations that would overlap paths or nodes
      if (nearPath(tx, ty, size + 12)) continue;

      ctx.globalAlpha = 0.12 + tRand(i * 5) * 0.10;

      switch (marchTheme) {
        case 'forest':
        case 'forest-dark': {
          const dark = marchTheme === 'forest-dark';
          const decoType = tRand(i * 19);
          if (dark && decoType > 0.55 && decoType <= 0.78) {
            // Forest-dark: mossy rocks (isometric)
            isoTransform(ctx, tx, ty);
            const rockCount = 1 + Math.floor(tRand(i * 31) * 2);
            for (let r = 0; r < rockCount; r++) {
              const rx = tx + (tRand(i * 33 + r) - 0.5) * size * 1.2;
              const ry = ty + (tRand(i * 37 + r) - 0.5) * size * 0.5;
              const rw = size * (0.4 + tRand(i * 39 + r) * 0.5);
              const rh = rw * (0.5 + tRand(i * 41 + r) * 0.3);
              ctx.fillStyle = '#4a4a3a';
              ctx.beginPath();
              ctx.ellipse(rx, ry, rw, rh, tRand(i * 43 + r) * 0.5, 0, Math.PI * 2);
              ctx.fill();
              // Moss patches on top
              ctx.fillStyle = '#3a6a2a';
              ctx.globalAlpha *= 0.7;
              ctx.beginPath();
              ctx.ellipse(rx - rw * 0.2, ry - rh * 0.3, rw * 0.5, rh * 0.35, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha /= 0.7;
            }
            ctx.restore();
          } else if (dark && decoType > 0.78) {
            // Forest-dark: fallen log with mushrooms (isometric)
            isoTransform(ctx, tx, ty);
            ctx.fillStyle = '#3a2a15';
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate((tRand(i * 23) - 0.5) * 0.6);
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 1.2, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.1); ctx.lineTo(-size * 0.5, size * 0.1); ctx.stroke();
            // Mushrooms
            ctx.fillStyle = '#8a6a3a';
            for (let m = 0; m < 2; m++) {
              const mx = (tRand(i * 29 + m) - 0.5) * size * 1.2;
              ctx.beginPath();
              ctx.ellipse(mx, -size * 0.25, size * 0.2, size * 0.08, 0, Math.PI, 0);
              ctx.fill();
            }
            ctx.restore();
            ctx.restore(); // isoTransform
          } else {
            // Pine tree with gentle sway (isometric)
            const time = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
            const swayAngle = Math.sin(time * 0.4 + i * 2.3) * 0.012;
            isoTransform(ctx, tx, ty);
            ctx.translate(tx, ty);
            ctx.rotate(swayAngle);
            ctx.translate(-tx, -ty);
            // Shadow ellipse on ground
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath();
            ctx.ellipse(tx + size * 0.3, ty + size * 0.3, size * 0.7, size * 0.25, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Canopy layers
            ctx.fillStyle = dark ? '#2a6a2a' : '#3a8a3a';
            for (let layer = 0; layer < 3; layer++) {
              const lw = size * (1 - layer * 0.25);
              const ly = ty - size * (0.6 + layer * 0.6);
              ctx.beginPath();
              ctx.moveTo(tx, ly - lw * 0.8);
              ctx.quadraticCurveTo(tx - lw * 0.6, ly - lw * 0.2, tx - lw, ly + lw * 0.3);
              ctx.quadraticCurveTo(tx, ly + lw * 0.15, tx + lw, ly + lw * 0.3);
              ctx.quadraticCurveTo(tx + lw * 0.6, ly - lw * 0.2, tx, ly - lw * 0.8);
              ctx.closePath();
              ctx.fill();
            }
            // Trunk
            ctx.fillStyle = '#5a3a20';
            ctx.beginPath();
            ctx.moveTo(tx - size * 0.14, ty + size * 0.5);
            ctx.quadraticCurveTo(tx - size * 0.12, ty, tx - size * 0.08, ty - size * 0.3);
            ctx.lineTo(tx + size * 0.08, ty - size * 0.3);
            ctx.quadraticCurveTo(tx + size * 0.12, ty, tx + size * 0.14, ty + size * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore(); // isoTransform + sway
          }
          break;
        }
        case 'warcamp': {
          isoTransform(ctx, tx, ty);
          if (tRand(i * 7) > 0.5) {
            // Tent (isometric — wider base, lower peak)
            ctx.fillStyle = '#7a5535';
            ctx.beginPath();
            ctx.moveTo(tx, ty - size * 1.2);
            ctx.quadraticCurveTo(tx - size * 0.5, ty - size * 0.3, tx - size, ty + size * 0.3);
            ctx.lineTo(tx + size, ty + size * 0.3);
            ctx.quadraticCurveTo(tx + size * 0.5, ty - size * 0.3, tx, ty - size * 1.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#5a3a20';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tx, ty - size * 1.2); ctx.lineTo(tx, ty + size * 0.3); ctx.stroke();
          } else {
            // Campfire ring (isometric ellipse)
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(tx, ty, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aa6030';
            ctx.beginPath();
            ctx.ellipse(tx, ty, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc8840';
            ctx.globalAlpha *= 0.6;
            ctx.beginPath();
            ctx.ellipse(tx, ty - size * 0.05, size * 0.12, size * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'bog': {
          // Reed clusters (isometric, with sway)
          const time3 = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
          isoTransform(ctx, tx, ty);
          ctx.strokeStyle = '#4a8a4a';
          ctx.lineWidth = 1.5;
          for (let r = 0; r < 4; r++) {
            const rx = tx + (tRand(i * 13 + r) - 0.5) * size * 1.5;
            const lean = (tRand(i * 17 + r) - 0.5) * 4;
            const sway = Math.sin(time3 * 0.5 + i * 1.7 + r) * 2;
            ctx.beginPath();
            ctx.moveTo(rx, ty + size * 0.2);
            ctx.quadraticCurveTo(rx + lean + sway, ty - size * 0.5, rx + lean * 1.5 + sway * 1.5, ty - size * 1.2);
            ctx.stroke();
          }
          // Mud puddle at base
          ctx.fillStyle = '#2a3a2a';
          ctx.globalAlpha *= 0.4;
          ctx.beginPath();
          ctx.ellipse(tx, ty + size * 0.2, size * 0.8, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'ancient': {
          // Gnarled tree with roots (isometric, with sway)
          const time4 = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
          const sway4 = Math.sin(time4 * 0.3 + i * 3.1) * 0.01;
          isoTransform(ctx, tx, ty);
          ctx.translate(tx, ty); ctx.rotate(sway4); ctx.translate(-tx, -ty);
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.07)';
          ctx.beginPath();
          ctx.ellipse(tx + size * 0.4, ty + size * 0.4, size * 0.9, size * 0.3, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Trunk
          ctx.fillStyle = '#4a3a18';
          ctx.beginPath();
          ctx.moveTo(tx - size * 0.25, ty + size * 0.4);
          ctx.quadraticCurveTo(tx - size * 0.2, ty - size * 0.3, tx - size * 0.1, ty - size * 0.8);
          ctx.lineTo(tx + size * 0.1, ty - size * 0.8);
          ctx.quadraticCurveTo(tx + size * 0.2, ty - size * 0.3, tx + size * 0.25, ty + size * 0.4);
          ctx.closePath();
          ctx.fill();
          // Canopy
          ctx.fillStyle = '#4a7a28';
          ctx.beginPath();
          ctx.ellipse(tx, ty - size, size * 0.9, size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          // Roots
          ctx.strokeStyle = '#3a2a10';
          ctx.lineWidth = 1.5;
          for (let r = 0; r < 3; r++) {
            ctx.beginPath();
            ctx.moveTo(tx + (r - 1) * size * 0.2, ty + size * 0.4);
            ctx.quadraticCurveTo(tx + (tRand(i * 23 + r) - 0.5) * size * 2, ty + size * 0.8, tx + (tRand(i * 29 + r) - 0.5) * size * 3, ty + size);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case 'blood': {
          // Standing stone with rune marks (isometric, no sway)
          isoTransform(ctx, tx, ty);
          ctx.fillStyle = '#4a2828';
          const stoneW = size * 0.5, stoneH = size * 1.6;
          ctx.beginPath();
          ctx.moveTo(tx - stoneW, ty + stoneH * 0.3);
          ctx.quadraticCurveTo(tx - stoneW * 0.9, ty - stoneH * 0.3, tx - stoneW * 0.6, ty - stoneH * 0.55);
          ctx.quadraticCurveTo(tx, ty - stoneH * 0.7, tx + stoneW * 0.6, ty - stoneH * 0.55);
          ctx.quadraticCurveTo(tx + stoneW * 0.9, ty - stoneH * 0.3, tx + stoneW, ty + stoneH * 0.3);
          ctx.closePath();
          ctx.fill();
          // Rune scratch
          ctx.strokeStyle = '#8a3030';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx - size * 0.15, ty - size * 0.4);
          ctx.lineTo(tx + size * 0.15, ty + size * 0.1);
          ctx.moveTo(tx + size * 0.15, ty - size * 0.4);
          ctx.lineTo(tx - size * 0.15, ty + size * 0.1);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'haunted': {
          isoTransform(ctx, tx, ty);
          if (tRand(i * 7) > 0.4) {
            // Gravestone (isometric, no sway)
            ctx.fillStyle = '#454560';
            ctx.beginPath();
            ctx.moveTo(tx - size * 0.3, ty + size * 0.3);
            ctx.quadraticCurveTo(tx - size * 0.3, ty - size * 0.6, tx, ty - size * 0.9);
            ctx.quadraticCurveTo(tx + size * 0.3, ty - size * 0.6, tx + size * 0.3, ty + size * 0.3);
            ctx.closePath();
            ctx.fill();
          } else {
            // Wisp (floating, with gentle drift)
            const time5 = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
            const drift = Math.sin(time5 * 0.6 + i * 2.1) * 3;
            ctx.fillStyle = '#5050bb';
            ctx.globalAlpha *= 0.5;
            ctx.beginPath();
            ctx.arc(tx + drift, ty, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4040aa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx + drift, ty);
            ctx.quadraticCurveTo(tx + size * 0.5 + drift, ty + size * 0.3, tx + size + drift * 0.5, ty - size * 0.2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case 'drowned': {
          isoTransform(ctx, tx, ty);
          if (tRand(i * 23) > 0.5) {
            // Broken column (isometric, no sway)
            ctx.fillStyle = '#3a5a68';
            ctx.beginPath();
            ctx.moveTo(tx - size * 0.25, ty);
            ctx.quadraticCurveTo(tx - size * 0.28, ty - size * 0.8, tx - size * 0.2, ty - size * 1.4);
            ctx.lineTo(tx + size * 0.2, ty - size * 1.4);
            ctx.quadraticCurveTo(tx + size * 0.28, ty - size * 0.8, tx + size * 0.25, ty);
            ctx.closePath();
            ctx.fill();
            // Capital
            ctx.beginPath();
            ctx.ellipse(tx, ty - size * 1.4, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Algae patch (isometric ellipse)
            ctx.fillStyle = '#2a6a5a';
            ctx.globalAlpha *= 0.6;
            ctx.beginPath();
            ctx.ellipse(tx, ty, size * 1.2, size * 0.4, tRand(i * 31) * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'heart': {
          // Fungal cluster (isometric, with gentle pulse via alpha)
          isoTransform(ctx, tx, ty);
          ctx.fillStyle = '#8a4020';
          for (let f = 0; f < 3; f++) {
            const fx = tx + (tRand(i * 29 + f) - 0.5) * size;
            const fy = ty + (tRand(i * 31 + f) - 0.5) * size * 0.5;
            const fs = size * (0.3 + tRand(i * 37 + f) * 0.4);
            ctx.beginPath();
            ctx.ellipse(fx, fy, fs, fs * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Tendrils (with sway)
          const time6 = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
          const tendrilSway = Math.sin(time6 * 0.4 + i * 1.9) * 3;
          ctx.strokeStyle = '#6a3018';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty + size * 0.4);
          ctx.quadraticCurveTo(tx + size + tendrilSway, ty + size, tx + size * 1.5 + tendrilSway, ty + size * 0.3);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'threshold': {
          // Spectral rift (isometric, with shimmer)
          isoTransform(ctx, tx, ty);
          const time7 = typeof this._mapAnimTime === 'number' ? this._mapAnimTime : 0;
          ctx.strokeStyle = '#6a3a8a';
          ctx.lineWidth = 2;
          const riftShift = Math.sin(time7 * 0.5 + i * 2.7) * 2;
          ctx.beginPath();
          ctx.moveTo(tx - size * 0.8, ty);
          ctx.bezierCurveTo(tx - size * 0.3, ty - size + riftShift, tx + size * 0.3, ty + size - riftShift, tx + size * 0.8, ty);
          ctx.stroke();
          // Void particles (drifting)
          ctx.fillStyle = '#5a2a7a';
          for (let p = 0; p < 3; p++) {
            const drift2 = Math.sin(time7 * 0.3 + p * 1.5 + i) * 2;
            const px2 = tx + (tRand(i * 41 + p) - 0.5) * size * 1.5 + drift2;
            const py2 = ty + (tRand(i * 43 + p) - 0.5) * size;
            ctx.beginPath();
            ctx.arc(px2, py2, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;

    // Irregular vignette — soft darkening at edges with organic variation
    const vignetteMargin = 40;
    // Left edge
    for (let v = 0; v < 8; v++) {
      const vy = tRand(v * 71 + 900) * totalHeight;
      const vw = vignetteMargin + tRand(v * 73 + 901) * 30;
      const vh = 80 + tRand(v * 77 + 902) * 120;
      const grad = ctx.createRadialGradient(0, vy, 0, 0, vy, vw + vh * 0.3);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, vy - vh, vw + vh * 0.3, vh * 2);
    }
    // Right edge
    for (let v = 0; v < 8; v++) {
      const vy = tRand(v * 79 + 910) * totalHeight;
      const vw = vignetteMargin + tRand(v * 83 + 911) * 30;
      const vh = 80 + tRand(v * 87 + 912) * 120;
      const grad = ctx.createRadialGradient(wrapperWidth, vy, 0, wrapperWidth, vy, vw + vh * 0.3);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(wrapperWidth - vw - vh * 0.3, vy - vh, vw + vh * 0.3, vh * 2);
    }
    // Top edge
    for (let v = 0; v < 5; v++) {
      const vx = tRand(v * 91 + 920) * wrapperWidth;
      const vr = 60 + tRand(v * 97 + 921) * 80;
      const grad = ctx.createRadialGradient(vx, 0, 0, vx, 0, vr);
      grad.addColorStop(0, 'rgba(0,0,0,0.3)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(vx - vr, -vr * 0.3, vr * 2, vr * 1.3);
    }
    // Bottom edge
    for (let v = 0; v < 5; v++) {
      const vx = tRand(v * 101 + 930) * wrapperWidth;
      const vr = 60 + tRand(v * 103 + 931) * 80;
      const grad = ctx.createRadialGradient(vx, totalHeight, 0, vx, totalHeight, vr);
      grad.addColorStop(0, 'rgba(0,0,0,0.3)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(vx - vr, totalHeight - vr, vr * 2, vr * 1.3);
    }
    // Corner darkening (stronger)
    const corners = [[0, 0], [wrapperWidth, 0], [0, totalHeight], [wrapperWidth, totalHeight]];
    corners.forEach((c, ci) => {
      const cr = 80 + tRand(ci * 113 + 940) * 60;
      const grad = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], cr);
      grad.addColorStop(0, 'rgba(0,0,0,0.45)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(c[0] - cr, c[1] - cr, cr * 2, cr * 2);
    });

    // Collect all edges with positions
    const edges = [];
    for (const node of this.mapNodes) {
      if (!isVisible(node)) continue;
      const from = nodePositions[node.id];
      for (const childId of node.children) {
        const childNode = this.mapNodes.find(n => n.id === childId);
        if (!childNode || !isVisible(childNode)) continue;
        const to = nodePositions[childId];
        if (!to) continue;
        edges.push({ from, to, nodeId: node.id, childId });
      }
    }

    // Stable pseudo-random from seed
    const seededRand = (seed) => {
      let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    // Group edges by depth to detect siblings that could cross
    const edgesByDepth = {};
    edges.forEach(e => {
      const node = this.mapNodes.find(n => n.id === e.nodeId);
      const d = node ? node.depth : 0;
      if (!edgesByDepth[d]) edgesByDepth[d] = [];
      edgesByDepth[d].push(e);
    });

    // For each edge, compute an offset that avoids crossing siblings
    const edgeOffsets = new Map();
    for (const depth in edgesByDepth) {
      const group = edgesByDepth[depth];
      // Sort edges by midpoint x to assign offsets that don't cross
      group.sort((a, b) => {
        const midA = (a.from.x + a.to.x) / 2;
        const midB = (b.from.x + b.to.x) / 2;
        return midA - midB;
      });
      group.forEach((e, i) => {
        // Base offset: spread siblings apart, centered around 0
        const spread = group.length > 1 ? ((i / (group.length - 1)) - 0.5) * 24 : 0;
        // Add per-edge wobble from hash
        const seed = e.nodeId * 31 + e.childId * 17;
        const wobble = (seededRand(seed) - 0.5) * 16;
        edgeOffsets.set(e, spread + wobble);
      });
    }

    // Draw a wiggly path using multiple quadratic segments
    const drawWigglyPath = (ctx, from, to, offset) => {
      const seed = Math.abs(from.x * 7 + from.y * 13 + to.x * 19 + to.y * 23);
      const segments = 4;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const baseX = from.x + (to.x - from.x) * t;
        const baseY = from.y + (to.y - from.y) * t;
        // No wobble on endpoints
        if (i === 0 || i === segments) {
          points.push({ x: baseX, y: baseY });
        } else {
          const wiggleX = (seededRand(seed + i * 73) - 0.5) * 28 + offset * (1 - Math.abs(t - 0.5) * 2);
          const wiggleY = (seededRand(seed + i * 137) - 0.5) * 12;
          points.push({ x: baseX + wiggleX, y: baseY + wiggleY });
        }
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2 + (seededRand(seed + i * 51) - 0.5) * 10;
        const cpy = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(cpx, cpy, curr.x, curr.y);
      }
      ctx.stroke();
    };

    // Draw all edges
    for (const edge of edges) {
      const { from, to, nodeId, childId } = edge;

      // Determine line style
      const bothVisited = visitedIds.has(nodeId) && visitedIds.has(childId);
      const isNextPath = (nodeId === this.currentNodeId || (startReachable && this.mapNodes.find(n => n.id === nodeId)?.depth === 0)) && reachableIds.includes(childId);

      if (bothVisited) {
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.7)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([7, 4]);
      } else if (isNextPath) {
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 4]);
      } else if (futureReachable.has(nodeId) && futureReachable.has(childId)) {
        ctx.strokeStyle = 'rgba(42, 46, 58, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = 'rgba(42, 46, 58, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
      }

      const offset = edgeOffsets.get(edge) || 0;
      drawWigglyPath(ctx, from, to, offset);
    }
    ctx.setLineDash([]);

    // Render node elements
    for (const node of this.mapNodes) {
      if (!isVisible(node)) continue;
      const pos = nodePositions[node.id];
      const el = document.createElement('div');

      const isReachableNode = startReachable ? (node.depth === 0) : reachableIds.includes(node.id);
      const isCurrent = node.id === this.currentNodeId;
      const isUnreachable = !node.visited && !futureReachable.has(node.id);
      const isFuture = !node.visited && !isReachableNode && !isCurrent && !isUnreachable;

      el.className = `map-node${node.visited ? ' visited' : ''}${isReachableNode ? ' reachable' : ''}${isCurrent ? ' current' : ''}${isUnreachable ? ' unreachable' : ''}${isFuture ? ' future' : ''} type-${node.type}`;
      el.style.left = (pos.x - 32) + 'px';
      el.style.top = (pos.y - 32) + 'px';

      let icon = '';
      const iconImg = (src) => `<img src="assets/map-icons/${src}" class="map-node-img">`;
      switch (node.type) {
        case 'combat':
          if (node.threat >= 3) icon = iconImg('hardEncounter.png');
          else if (node.threat >= 2) icon = iconImg('mediumEncounter.png');
          else icon = iconImg('easyEncounter.png');
          break;
        case 'event':
          if (node.encounter && node.encounter.type === 'item_trade') icon = iconImg('merchant.png');
          else if (node.encounter && node.encounter.type === 'item_upgrade') icon = iconImg('smith.png');
          else if (node.encounter && node.encounter.type === 'skill_upgrade') icon = iconImg('skillTeacher.png');
          else icon = iconImg('event.png');
          break;
        case 'rest': icon = iconImg('camp.png'); break;
        case 'boss': icon = iconImg('bossFight.png'); break;
      }

      el.innerHTML = `<span class="map-node-icon">${icon}</span>`;

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
      this.showBossIntro(node);
    } else if (node.type === 'event') {
      this.startEventNode(node);
    } else if (node.type === 'rest') {
      this.startRestNode(node);
    }
  }

  showBossIntro(node) {
    const bossEnemyId = node.encounter.enemies.find(eid => ENEMY_DATA[eid] && ENEMY_DATA[eid].isBoss);
    const bossData = bossEnemyId ? ENEMY_DATA[bossEnemyId] : null;
    const bossName = bossData ? bossData.name : node.encounter.name;
    // Use the encounter intro as flavor text (not the mechanical description)
    const bossFlavorText = node.encounter.intro || (bossData ? bossData.description : '');

    // Switch to combat screen first (hidden behind splash) to prevent map flash
    this.currentNodeThreat = node.threat || 1;
    this.engine.initEncounter(node.encounter);
    this.showScreen('combat-screen');
    this.selectedUnitIndex = null;
    this.stagedSkill = null;
    this.prevEnemyHp = {};
    this.prevUnitHp = {};
    this._prevBossHpPct = undefined;
    this.diceRevealRunning = false;

    // Create splash overlay on top
    const splash = document.createElement('div');
    splash.id = 'boss-intro-splash';
    splash.className = 'boss-intro-splash';
    splash.innerHTML = `
      <div class="boss-intro-content">
        <div class="boss-intro-line"></div>
        <div class="boss-intro-name">${bossName.includes(' ') ? bossName.replace(/(.*)\s/, '$1<br>') : bossName}</div>
        <div class="boss-intro-desc">${bossFlavorText}</div>
        <div class="boss-intro-line"></div>
      </div>
    `;
    document.getElementById('game').appendChild(splash);

    // Brief silence before boss music
    if (window.game && window.game.currentTrack) {
      window.game.stopTrack(window.game.currentTrack, 800);
      window.game.currentTrack = null;
    }

    // After 2.5s: fade out splash, start boss music, auto-start fight
    setTimeout(() => {
      splash.classList.add('fade-out');
      window.game.startBossMusic(bossEnemyId);
      setTimeout(() => {
        splash.remove();
        // Auto-start: skip "Begin Encounter" and go straight to spawning
        this.engine.beginSpawning();
      }, 600);
    }, 3500);
  }

  startCombatNode(node) {
    this.currentNodeThreat = node.threat || 1;
    this.engine.initEncounter(node.encounter);
    this.showScreen('combat-screen');
    this.selectedUnitIndex = null;
    this.stagedSkill = null;
    this.prevEnemyHp = {};
    this.prevUnitHp = {};
    this._prevBossHpPct = undefined;
    this.diceRevealRunning = false;
    this.render();

    // Ambush encounters: show splash then auto-start
    if (node.encounter.isAmbush) {
      this.showAmbushSplash();
    }
  }

  showAmbushSplash() {
    const splash = document.createElement('div');
    splash.id = 'ambush-splash';
    splash.className = 'ambush-splash';
    splash.innerHTML = `
      <div class="ambush-splash-content">
        <div class="ambush-splash-text">AMBUSH!</div>
      </div>
    `;
    document.getElementById('game').appendChild(splash);

    // After 1.5s: fade out and auto-start the encounter (enemies go first)
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.remove();
        this.engine.beginSpawning();
      }, 500);
    }, 1500);
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
    if (event.type === 'item_trade') {
      this.showItemTradeEvent(event);
      return;
    }

    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-intro').textContent = event.intro;
    document.getElementById('event-outcome').classList.add('hidden');

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    event.choices.forEach((choice, ci) => {
      // Check class/tag requirements
      const party = this.engine.party;
      const aliveParty = party.filter(u => !u.downed);
      let meetsRequirement = true;
      let requirementLabel = '';

      if (choice.requiresTag) {
        const hasTag = aliveParty.some(u => {
          const tags = CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].tags : [];
          return tags.includes(choice.requiresTag);
        });
        if (!hasTag) {
          meetsRequirement = false;
          const tagLabels = { melee: 'fighters', command: 'an officer', support: 'a medic', ranged: 'a marksman' };
          requirementLabel = tagLabels[choice.requiresTag] || choice.requiresTag;
        }
      }

      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      if (!meetsRequirement) {
        btn.classList.add('event-choice-locked');
        btn.innerHTML = `${choice.text} <span class="event-requires">(Requires ${requirementLabel})</span>`;
        btn.disabled = true;
      } else {
        btn.textContent = choice.text;
        btn.addEventListener('click', () => this.resolveEventChoice(event, choice));
      }
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

    // Apply effects — scale with difficulty
    const effects = outcome.effects || {};
    const diff = window.game ? window.game.difficulty : 1;
    const diffScale = 1 + (diff - 1) * 0.25; // +25% per difficulty above 1

    if (effects.healAll) {
      const scaledHeal = Math.round(effects.healAll * diffScale);
      this.engine.party.forEach(u => {
        if (!u.downed) {
          u.hp = Math.min(u.maxHp, u.hp + scaledHeal);
        }
      });
    }
    if (effects.damageAll) {
      const scaledDmg = Math.round(effects.damageAll * diffScale);
      this.engine.party.forEach(u => {
        if (!u.downed) {
          u.hp = Math.max(1, u.hp - scaledDmg);
        }
      });
    }
    if (effects.morale) {
      const scaledMorale = effects.morale > 0
        ? Math.round(effects.morale * diffScale)
        : Math.round(effects.morale * diffScale); // negative scales too (harsher)
      this.engine.morale = Math.max(0, Math.min(100, this.engine.morale + scaledMorale));
    }
    // Event buffs: grant damage/block buffs to all allies for next combat
    if (effects.buffDamage) {
      this.engine.party.forEach(u => {
        if (!u.downed) u.buffs.push({ damage: effects.buffDamage, attacksLeft: effects.buffAttacks || 2 });
      });
    }
    if (effects.grantBlock) {
      this.engine.party.forEach(u => {
        if (!u.downed) u.block = (u.block || 0) + effects.grantBlock;
      });
    }
    if (effects.poisonParty) {
      this.engine.party.forEach(u => {
        if (!u.downed) u.poison = (u.poison || 0) + effects.poisonParty;
      });
    }
    if (effects.extraDiceNext) {
      this.engine._eventBonusDice = (this.engine._eventBonusDice || 0) + effects.extraDiceNext;
    }
    if (effects.maxHpAll) {
      this.engine.party.forEach(u => {
        if (!u.downed) {
          u.maxHp += effects.maxHpAll;
          u.baseMaxHp += effects.maxHpAll;
          u.hp += effects.maxHpAll;
        }
      });
    }
    // grantRandomItem: pick one random item from a list and grant it
    if (effects.grantRandomItem && Array.isArray(effects.grantRandomItem)) {
      const pool = effects.grantRandomItem.filter(id => {
        const item = getItemData(id);
        return item && this.engine.party.some(u => canEquipItem(u, item));
      });
      if (pool.length > 0) {
        effects.grantItem = pool[Math.floor(Math.random() * pool.length)];
      } else {
        effects.grantItem = effects.grantRandomItem[Math.floor(Math.random() * effects.grantRandomItem.length)];
      }
    }
    if (effects.grantItem) {
      const grantedItem = getItemData(effects.grantItem);
      const canUse = grantedItem && this.engine.party.some(u => canEquipItem(u, grantedItem));
      const difficulty = window.game ? window.game.difficulty : 1;

      let finalItemId = effects.grantItem;
      if (!canUse) {
        // Try to find a fallback item of same rarity that someone can use
        const targetRarity = grantedItem ? grantedItem.rarity : 'common';
        const allItemIds = Object.keys(ITEM_DATA);
        const fallbacks = allItemIds.filter(id => {
          const it = ITEM_DATA[id];
          if (!it || it.rarity !== targetRarity) return false;
          if (it.minDifficulty && it.minDifficulty > difficulty) return false;
          if (it.baseId) return false; // skip leveled instances
          return this.engine.party.some(u => canEquipItem(u, it));
        });
        if (fallbacks.length > 0) {
          finalItemId = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        } else {
          finalItemId = null;
        }
      }

      if (finalItemId) {
        const finalItem = getItemData(finalItemId);
        const itemNativeDiff = finalItem ? (finalItem.minDifficulty || 1) : 1;
        const scaledBonus = Math.max(0, difficulty - itemNativeDiff);
        const minBonus = Math.max(0, Math.floor((difficulty - 1) / 2));
        const bonusLevels = Math.max(scaledBonus, minBonus);
        this.pendingEventItem = bonusLevels > 0 ? createLeveledItem(finalItemId, bonusLevels) : finalItemId;
      } else {
        // No usable item at all — convert to Renown
        this.pendingEventItem = null;
        const renownGain = { common: 2, uncommon: 5, rare: 10, epic: 20 }[grantedItem ? grantedItem.rarity : 'common'] || 2;
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
    if (effects.buffDamage) outcomeText += ` (+${effects.buffDamage} damage for ${effects.buffAttacks || 2} attacks)`;
    if (effects.grantBlock) outcomeText += ` (+${effects.grantBlock} Block)`;
    if (effects.poisonParty) outcomeText += ` (${effects.poisonParty} Poison to all)`;
    if (effects.extraDiceNext) outcomeText += ` (+${effects.extraDiceNext} bonus dice next combat)`;
    if (effects.maxHpAll) outcomeText += ` (+${effects.maxHpAll} max HP to all)`;
    // Permanent stat boosts to specific units by tag
    if (effects.grantMaxHp) {
      const { amount, tag, count } = effects.grantMaxHp;
      const eligible = this.engine.party.filter(u => !u.downed && (!tag || (CLASS_DATA[u.classId] && CLASS_DATA[u.classId].tags.includes(tag))));
      const targets = eligible.sort(() => Math.random() - 0.5).slice(0, count || 1);
      targets.forEach(u => { u.maxHp += amount; u.baseMaxHp += amount; u.hp += amount; });
      if (targets.length > 0) outcomeText += ` (${targets.map(u => u.name).join(', ')} +${amount} max HP)`;
    }
    if (effects.grantDamage) {
      const { amount, tag, count } = effects.grantDamage;
      const eligible = this.engine.party.filter(u => !u.downed && (!tag || (CLASS_DATA[u.classId] && CLASS_DATA[u.classId].tags.includes(tag))));
      const targets = eligible.sort(() => Math.random() - 0.5).slice(0, count || 1);
      targets.forEach(u => { u.equipDamage = (u.equipDamage || 0) + amount; });
      if (targets.length > 0) outcomeText += ` (${targets.map(u => u.name).join(', ')} +${amount} permanent damage)`;
    }
    if (effects.grantPoison) {
      const { amount, tag, count } = effects.grantPoison;
      // Poison only goes to support or ranged classes
      const poisonTag = tag || null;
      const eligible = this.engine.party.filter(u => {
        if (u.downed) return false;
        const tags = CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].tags : [];
        if (poisonTag) return tags.includes(poisonTag);
        return tags.includes('support') || tags.includes('ranged');
      });
      const targets = eligible.sort(() => Math.random() - 0.5).slice(0, count || 1);
      targets.forEach(u => { u.equipPoison = (u.equipPoison || 0) + amount; });
      if (targets.length > 0) outcomeText += ` (${targets.map(u => u.name).join(', ')} +${amount} permanent poison)`;
    }
    if (effects.grantHeal) {
      const { amount, tag, count } = effects.grantHeal;
      const eligible = this.engine.party.filter(u => !u.downed && (!tag || (CLASS_DATA[u.classId] && CLASS_DATA[u.classId].tags.includes(tag))));
      const targets = eligible.sort(() => Math.random() - 0.5).slice(0, count || 1);
      targets.forEach(u => { u.equipHeal = (u.equipHeal || 0) + amount; });
      if (targets.length > 0) outcomeText += ` (${targets.map(u => u.name).join(', ')} +${amount} permanent healing)`;
    }
    if (effects.grantBlock && typeof effects.grantBlock === 'object') {
      const { amount, tag, count } = effects.grantBlock;
      const eligible = this.engine.party.filter(u => !u.downed && (!tag || (CLASS_DATA[u.classId] && CLASS_DATA[u.classId].tags.includes(tag))));
      const targets = eligible.sort(() => Math.random() - 0.5).slice(0, count || 1);
      targets.forEach(u => { u.equipBlock = (u.equipBlock || 0) + amount; });
      if (targets.length > 0) outcomeText += ` (${targets.map(u => u.name).join(', ')} +${amount} permanent block)`;
    }
    if (effects.grantItem) {
      if (this.pendingEventItem) {
        const foundItem = getItemData(this.pendingEventItem);
        if (foundItem) outcomeText += ` (Found: ${foundItem.name})`;
      } else {
        const origItem = getItemData(effects.grantItem);
        const renownGain = { common: 2, uncommon: 5, rare: 10, epic: 20 }[origItem ? origItem.rarity : 'common'] || 2;
        outcomeText += ` (Nothing usable found — +${renownGain} Renown)`;
      }
    }

    document.getElementById('event-outcome-text').textContent = outcomeText;

    document.getElementById('btn-event-continue').onclick = () => {
      if (effects.triggerCombat) {
        // Start combat encounter from event
        const combatData = effects.triggerCombat;
        let eventLoot = combatData.loot || [];
        // lootCount: pick N random items from the pool
        if (combatData.lootCount && combatData.lootCount < eventLoot.length) {
          const shuffled = [...eventLoot].sort(() => Math.random() - 0.5);
          eventLoot = shuffled.slice(0, combatData.lootCount);
        }
        this.pendingEventCombatLoot = eventLoot;
        const encounter = { name: combatData.name, enemies: combatData.enemies, intro: combatData.intro };
        this.currentNodeThreat = 3;
        this.engine.initEncounter(encounter);
        this.showScreen('combat-screen');
        this.selectedUnitIndex = null;
        this.stagedSkill = null;
        this.prevEnemyHp = {};
        this.prevUnitHp = {};
        this._prevBossHpPct = undefined;
        this.diceRevealRunning = false;
        this.render();
      } else if (this.pendingEventItem) {
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

    // Gather all learned skills that have upgradeable numeric effects
    const allSkills = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        u.skills.forEach(s => {
          const baseDef = u.allSkills.find(a => a.id === s.id);
          if (!baseDef || !baseDef.effects) return;
          // Only include if skill has at least one upgradeable effect
          const hasNumeric = Object.values(baseDef.effects).some(v => typeof v === 'number');
          const hasBuff = !!baseDef.effects.buffAllies;
          if (hasNumeric || hasBuff) allSkills.push({ unit: u, skill: s, baseDef });
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
      // Gather all upgradeable stats for this skill, then pick one randomly
      const effects = baseDef.effects || {};
      const friendlyNames = { counterStance: 'counter damage', overwatch: 'overwatch damage', snareTrap: 'trap damage', suppress: 'suppress duration', cripple: 'cripple duration', deafen: 'deafen duration', condemn: 'condemn duration', transfusion: 'transfer HP' };
      const candidates = [];
      if (effects.damage) candidates.push({ key: 'damage', text: `+1 damage (${effects.damage} → ${effects.damage + 1})`, apply: () => baseDef.effects.damage++ });
      if (effects.heal) candidates.push({ key: 'heal', text: `+1 healing (${effects.heal} → ${effects.heal + 1})`, apply: () => baseDef.effects.heal++ });
      if (effects.healAll) candidates.push({ key: 'healAll', text: `+1 healing to all (${effects.healAll} → ${effects.healAll + 1})`, apply: () => baseDef.effects.healAll++ });
      if (effects.block) candidates.push({ key: 'block', text: `+1 block (${effects.block} → ${effects.block + 1})`, apply: () => baseDef.effects.block++ });
      if (effects.blockAll) candidates.push({ key: 'blockAll', text: `+1 block to all (${effects.blockAll} → ${effects.blockAll + 1})`, apply: () => baseDef.effects.blockAll++ });
      if (effects.poison) candidates.push({ key: 'poison', text: `+1 poison (${effects.poison} → ${effects.poison + 1})`, apply: () => baseDef.effects.poison++ });
      if (effects.poisonAll) candidates.push({ key: 'poisonAll', text: `+1 poison to all (${effects.poisonAll} → ${effects.poisonAll + 1})`, apply: () => baseDef.effects.poisonAll++ });
      if (effects.morale) candidates.push({ key: 'morale', text: `+3 morale (${effects.morale} → ${effects.morale + 3})`, apply: () => baseDef.effects.morale += 3 });
      if (effects.damageAll) candidates.push({ key: 'damageAll', text: `+1 damage to all (${effects.damageAll} → ${effects.damageAll + 1})`, apply: () => baseDef.effects.damageAll++ });
      if (effects.selfDamage) candidates.push({ key: 'selfDamage', text: `-1 self damage (${effects.selfDamage} → ${effects.selfDamage - 1})`, apply: () => baseDef.effects.selfDamage-- });
      if (effects.buffAllies) candidates.push({ key: 'buffAllies', text: `+1 buff damage (${effects.buffAllies.bonusDamage} → ${effects.buffAllies.bonusDamage + 1})`, apply: () => baseDef.effects.buffAllies.bonusDamage++ });
      // Fallback numeric effects — exclude non-upgradeable mechanics
      const excludeFromUpgrade = new Set([
        'pierceBlock', 'moraleCost', 'bonusDmgScale', 'caltrops', 'splashAdjacentPct', 'momentumStrike', 'breakneckCharge', 'allInCharge', 'gladiusThrust', 'aimedShot',
        'dieScaleDamage', 'dieScaleBlock', 'dieScaleHeal', 'splitDamage', 'splashHalf',
        'splashRow', 'pierceRow', 'splashBackRow', 'execute', 'markTarget', 'knockback',
        'shieldbreak', 'shieldbreakAll', 'blockOthersOnly', 'halfBonusDmg',
        'halfScaleSelfDamage', 'moraleScaling', 'killShot', 'doublePoison',
        'ignoreRow', 'taunt', 'cleanse', 'revive', 'stimulant', 'intercept',
        'stun', 'overrun', 'shoulderCharge', 'echoOnKill', 'warhorseKick',
        'smokeScreen', 'damageShield', 'resonance', 'pullToFront',
        'consumeAllBuffs', 'moraleHealAll', 'avengeDamage', 'deafenAll',
        'fortifiedStrike', 'precisionDrill', 'bonusDiceNext', 'cleanseAll', 'triageStrike',
        'calculatedDosage', 'trickShot', 'wildernessInstinct', 'fortunesFavor',
        'freeAction', 'harmonicFrequency', 'flankingStrike', 'scoutingManeuver',
        'healSelf', 'skipNextTurn', 'imperialDecree', 'lastStand', 'blockScale',
        'herbPoulticePoison', 'wolfbite', 'shieldWallDance', 'predatorsPounce',
        'bonusHealScale', 'flameTouch', 'vestasJudgment', 'divineIntercession',
        'litanyOfCourage', 'flameShield', 'wrathOfVesta', 'resurrectionPrayer',
        'lacedBlade', 'misdirection', 'deadDrop', 'shadowNetwork', 'assassination',
        'contingencyPlan', 'deepCover', 'mountedSweep', 'armoredAdvance',
        'destriersFury', 'cataphractsDoom',
      ]);
      for (const k of Object.keys(effects)) {
        if (typeof effects[k] === 'number' && !candidates.some(c => c.key === k) && !excludeFromUpgrade.has(k)) {
          const label = friendlyNames[k] || k;
          candidates.push({ key: k, text: `+1 ${label} (${effects[k]} → ${effects[k] + 1})`, apply: () => baseDef.effects[k]++ });
        }
      }

      if (candidates.length === 0) return;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const upgradeText = chosen.text;

      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      const tag = getPrimaryTag(unit.classId);
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong>${skill.name}</strong><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;

      btn.addEventListener('click', () => {
        // Apply the randomly chosen upgrade
        chosen.apply();

        // Also update the runtime skill copy
        const runtimeSkill = unit.skills.find(s => s.id === skill.id);
        if (runtimeSkill && runtimeSkill.execute) {
          // Rebuild execute from updated baseDef
          // The execute is rebuilt from effects via buildSkillExecute
        }

        // Update description — replace the number matching the upgraded stat
        const descPatterns = {
          damage: /([Dd]eal[s]?\s+)(\d+)(\s+damage|.*\+ die value damage)/,
          damageAll: /(\d+)(\s+damage)/,
          heal: /(\d+)(\s+HP|.*healing)/,
          healAll: /(\d+)(\s+HP|.*healing)/,
          block: /(\d+)(\s+Block|\s+\+ die value Block)/,
          blockAll: /(\d+)(\s+Block)/,
          poison: /(\d+)(\s+[Pp]oison)/,
          poisonAll: /(\d+)(\s+[Pp]oison)/,
          morale: /([+-]?\d+)(\s+[Mm]orale)/,
          selfDamage: /(\d+)(\s+HP)/,
          buffAllies: /\+(\d+)(\s+damage)/,
        };
        const pattern = descPatterns[chosen.key];
        if (pattern) {
          const oldDesc = baseDef.description;
          baseDef.description = oldDesc.replace(pattern, (match, ...groups) => {
            // Find which group is the number and increment/decrement it
            const numGroupIdx = groups.findIndex(g => typeof g === 'string' && /^[+-]?\d+$/.test(g));
            if (numGroupIdx >= 0) {
              const oldVal = parseInt(groups[numGroupIdx]);
              const newVal = chosen.key === 'selfDamage' ? oldVal - 1 : (chosen.key === 'morale' ? oldVal + 3 : oldVal + 1);
              groups[numGroupIdx] = String(newVal);
              return groups.slice(0, -2).join(''); // exclude offset and full string
            }
            return match;
          });
        }

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
      // Determine which stat will be upgraded (same logic as createLeveledItem)
      const stats = item.stats;
      const statKeys = Object.keys(stats).filter(k => k !== 'extraDice' && stats[k] >= 0);
      const currentLevel = item.level || 1;
      const newLevel = currentLevel + 1;

      // Pre-pick the stat that would be upgraded (only positive stats)
      let statKey = '';
      let upgradeText = '';
      if (statKeys.length > 0) {
        statKey = statKeys[Math.floor(Math.random() * statKeys.length)];
        const current = stats[statKey];
        const next = current + 1;
        const statLabel = { damage: 'Damage', block: 'Block', maxHp: 'HP', heal: 'Heal', poison: 'Poison' }[statKey] || statKey;
        upgradeText = `Lv${currentLevel} → ${newLevel}: ${statLabel} ${current} → ${next}`;
      } else {
        upgradeText = 'Already at maximum power.';
      }

      const tag = getPrimaryTag(unit.classId);
      const baseName = item.baseId ? ITEM_DATA[item.baseId].name : item.name.replace(/ \+\d+$/, '');
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong class="rarity-${item.rarity}">${item.name}</strong> <span style="font-size:0.65rem;color:var(--text-dim)">(${item.rarity})</span><br><span style="font-size:0.75rem;color:var(--text-dim)">${formatItemStats(stats)}</span><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;

      if (!statKey) {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
      } else {
        btn.addEventListener('click', () => {
          // Apply level-up: increment the chosen stat
          ITEM_DATA[itemId].stats[statKey]++;
          // Update level and name
          ITEM_DATA[itemId].level = newLevel;
          ITEM_DATA[itemId].name = baseName + ' +' + (newLevel - 1);
          if (!ITEM_DATA[itemId].baseId) ITEM_DATA[itemId].baseId = itemId;

          // Apply maxHp change if that stat was upgraded
          if (statKey === 'maxHp') {
            unit.maxHp++;
            unit.baseMaxHp++;
            unit.hp++;
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
  // SHOP (ITEM TRADE) SCREEN
  // ================================================================

  showItemTradeEvent(event) {
    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-intro').textContent = event.intro;
    document.getElementById('event-outcome').classList.add('hidden');
    document.getElementById('event-outcome-text').textContent = '';
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    const rarityOrder = ['common', 'uncommon', 'rare', 'epic'];

    // Gather all equipped items that can be upgraded in rarity
    const allItems = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach((id, slotIdx) => {
            if (!id) return;
            const item = getItemData(id);
            if (!item) return;
            const rarityIdx = rarityOrder.indexOf(item.rarity);
            if (rarityIdx < 0 || rarityIdx >= rarityOrder.length - 1) return; // already max rarity
            allItems.push({ unit: u, itemId: id, item, slot, slotIdx, rarityIdx });
          });
        }
      }
    });

    // Pick up to 5 random items
    const shuffled = allItems.sort(() => Math.random() - 0.5).slice(0, 5);

    if (shuffled.length === 0) {
      choicesEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">Nothing to trade.</div>';
      document.getElementById('event-outcome').classList.remove('hidden');
      document.getElementById('event-outcome-text').textContent = 'The trader shrugs and packs up.';
      document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
      return;
    }

    shuffled.forEach(({ unit, itemId, item, slot, slotIdx, rarityIdx }) => {
      const nextRarity = rarityOrder[rarityIdx + 1];
      const tag = getPrimaryTag(unit.classId);

      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      const article = /^[aeiou]/i.test(nextRarity) ? 'an' : 'a';
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong class="rarity-${item.rarity}">${item.name}</strong> ${renderTagPips(item.classTags)}<br><span style="font-size:0.75rem;color:var(--text-dim)">${formatItemStats(item.stats)} (${item.rarity})</span><br><span style="font-size:0.75rem;color:var(--gold)">Trade for ${article} ${nextRarity} ${slot}</span>`;

      btn.addEventListener('click', () => {
        // Find eligible replacement items: same slot, higher rarity, matching class tags
        const unitTags = CLASS_DATA[unit.classId] ? CLASS_DATA[unit.classId].tags : [];
        const candidates = Object.values(ITEM_DATA).filter(candidate => {
          if (candidate.slot !== slot) return false;
          if (candidate.rarity !== nextRarity) return false;
          if (candidate.id === itemId) return false;
          // Check class tag compatibility
          if (!candidate.classTags.some(ct => ct === 'roman' || unitTags.includes(ct))) return false;
          // Trader ignores minDifficulty — gambling should circumvent restrictions
          return true;
        });

        if (candidates.length === 0) {
          document.getElementById('event-outcome').classList.remove('hidden');
          document.getElementById('event-outcome-text').textContent = 'The trader has nothing suitable to offer in return.';
          document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
          choicesEl.innerHTML = '';
          return;
        }

        // Pick a random replacement
        const replacement = candidates[Math.floor(Math.random() * candidates.length)];

        // Clone the item data so upgrades don't affect the base template
        const newId = replacement.id + '_trade_' + Date.now();
        ITEM_DATA[newId] = JSON.parse(JSON.stringify(replacement));
        ITEM_DATA[newId].id = newId;

        // Swap the item on the unit
        unit.equipment[slot][slotIdx] = newId;
        this.engine.computeEquipmentStats(unit);

        // Handle maxHp changes
        const oldMaxHp = item.stats.maxHp || 0;
        const newMaxHp = replacement.stats.maxHp || 0;
        if (newMaxHp !== oldMaxHp) {
          const diff = newMaxHp - oldMaxHp;
          unit.maxHp += diff;
          unit.baseMaxHp += diff;
          unit.hp = Math.min(unit.hp + Math.max(0, diff), unit.maxHp);
        }

        choicesEl.innerHTML = '';
        document.getElementById('event-outcome').classList.remove('hidden');
        const specialLine = replacement.special ? `<br><span style="font-size:0.75rem;color:var(--gold)">${formatItemSpecial(replacement)}</span>` : '';
        document.getElementById('event-outcome-text').innerHTML = `Traded <strong class="rarity-${item.rarity}">${item.name}</strong> for:<br><br><strong class="rarity-${replacement.rarity}">${replacement.name}</strong> <span style="font-size:0.75rem;color:var(--text-dim)">(${replacement.rarity})</span><br><span style="font-size:0.85rem">${formatItemStats(replacement.stats)}</span>${specialLine}`;
        document.getElementById('btn-event-continue').onclick = () => this.showMapScreen();
      });

      choicesEl.appendChild(btn);
    });

    // Skip option
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-event-choice';
    skipBtn.innerHTML = '<span style="color:var(--text-dim)">Leave without trading.</span>';
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

    // Show party status (morale + HP)
    let statusEl = document.getElementById('camp-party-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'camp-party-status';
      const introEl = document.getElementById('event-intro');
      introEl.parentNode.insertBefore(statusEl, introEl.nextSibling);
    }
    const moraleBand = getMoraleBand(this.engine.morale);
    let statusHtml = `<div class="camp-morale">Morale: <span style="color:${moraleBand.color}">${this.engine.morale} (${moraleBand.label})</span></div>`;
    statusHtml += '<div class="camp-units">';
    this.engine.party.forEach(u => {
      const tag = getPrimaryTag(u.classId);
      const hpPct = Math.round((u.hp / u.maxHp) * 100);
      const hpColor = hpPct > 60 ? 'var(--green-bright)' : hpPct > 30 ? 'var(--gold)' : 'var(--red-bright)';
      statusHtml += `<div class="camp-unit-status">
        <span class="camp-unit-name" style="color:var(--class-${tag})">${u.title}</span>
        <span class="camp-unit-hp" style="color:${hpColor}">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp}`}</span>
        <div class="camp-hp-bar"><div class="camp-hp-fill" style="width:${u.downed ? 0 : hpPct}%;background:${hpColor}"></div></div>
      </div>`;
    });
    statusHtml += '</div>';
    statusEl.innerHTML = statusHtml;

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

    const diff = window.game ? window.game.difficulty : 1;
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
        desc: 'Restore 8 Morale.',
        action: () => {
          this.engine.morale = Math.min(100, this.engine.morale + 8);
          this.campLog.push('Words of courage by the fire. (+8 Morale)');
        }
      },
      {
        name: 'Sharpen Weapons',
        desc: `All soldiers gain +${1 + Math.floor(diff / 3)} damage for next ${2 + Math.floor(diff / 4)} attacks.`,
        action: () => {
          const bonusDmg = 1 + Math.floor(diff / 3);
          const bonusAtk = 2 + Math.floor(diff / 4);
          this.engine.party.forEach(u => {
            if (!u.downed) u.buffs.push({ damage: bonusDmg, attacksLeft: bonusAtk });
          });
          this.campLog.push(`Blades sharpened to a fine edge. (+${bonusDmg} damage, ${bonusAtk} attacks)`);
        }
      },
      {
        name: 'Fortify Position',
        desc: `All soldiers start the next fight with ${4 + diff} Block.`,
        action: () => {
          const blockAmt = 4 + diff;
          this.engine.party.forEach(u => {
            if (!u.downed) u.block = (u.block || 0) + blockAmt;
          });
          this.campLog.push(`Makeshift barricades built. (+${blockAmt} Block each)`);
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
    const bossEnemy = isBoss ? this.engine.enemies.find(e => e.isBoss) : null;
    const bossVictoryText = {
      'arminius_champion': { title: 'THE WARLORD FALLS', text: 'The Germanic warlord lies broken. His warriors scatter into the trees.' },
      'grove_witch': { title: 'THE WITCH BURNS', text: 'The grove witch crumbles into ash and root. The forest exhales.' },
      'silent_huntsman': { title: 'THE HUNTER FALLS', text: 'The huntsman\'s bow clatters to the ground. Silence returns to the canopy.' },
      'mire_mother': { title: 'THE MOTHER FALLS', text: 'The great sow collapses. Her brood scatters, squealing into the mire.' },
      'bone_speaker': { title: 'THE BONES ARE SILENT', text: 'The bone speaker\'s chanting stops. The dead lie still at last.' },
      'serpent_shaman': { title: 'THE DANCER STILLS', text: 'The shaman collapses mid-step. Her serpents dissolve into mist.' },
      'fog_weaver': { title: 'THE FOG LIFTS', text: 'The weaver shrieks and unravels. The fog parts, and the path is clear.' },
      'blood_stag': { title: 'THE STAG FALLS', text: 'The crimson stag crashes to the earth. The forest trembles with its passing.' },
      'corpse_of_arminius': { title: 'ARMINIUS RESTS', text: 'The corpse crumbles. The betrayer of Rome is laid to rest at last.' },
      'corpse_of_varus': { title: 'VARUS IS REDEEMED', text: 'The ghost of the general fades. Rome\'s shame dissolves into the mist.' },
      'spirit_of_arminius': { title: 'THE SPIRITS PART', text: 'Arminius and Varus — bound in death — are finally unbound. The forest sighs.' },
      'thusnelda': { title: 'THUSNELDA RETREATS', text: 'The chieftain\'s wife vanishes into the treeline, wolves at her heels. She will not forget.' },
      'revenant_of_ariovistus': { title: 'THE KING FALLS', text: 'The dead king sinks back into his barrow. The crown rolls free.' },
    };
    const bossText = bossEnemy && bossVictoryText[bossEnemy.id]
      ? bossVictoryText[bossEnemy.id]
      : { title: 'THE CHAMPION FALLS', text: 'The enemy leader lies defeated. The path is clear.' };
    const title = isBoss ? bossText.title : 'ENCOUNTER WON';
    const text = isBoss ? bossText.text : 'The enemy falls. You press deeper into the forest.';

    // Track stats
    if (window.game) window.game.trackEncounterStats();

    // Calculate renown for this encounter
    const renownBreakdown = this.engine.calculateRenown();
    this.engine.totalRenownEarned += renownBreakdown.total;
    this.engine.encountersCompleted++;

    this.showSummary(title, text, isBoss, renownBreakdown);
  }

  onDefeat() {
    this.showRunSummary(false);
  }

  showSummary(title, text, isBossOrDefeat, renownBreakdown) {
    this.showScreen('summary-screen');
    document.getElementById('summary-title').textContent = title;
    document.getElementById('summary-text').textContent = text;

    const statsEl = document.getElementById('summary-stats');
    let statsHtml = '';

    // Renown breakdown
    if (renownBreakdown && renownBreakdown.total > 0) {
      const r = renownBreakdown;
      const speedLabel = r.speedMultiplier >= 1.2 ? 'Swift' : r.speedMultiplier >= 0.9 ? 'Steady' : 'Prolonged';
      const speedColor = r.speedMultiplier >= 1.2 ? 'var(--green-bright)' : r.speedMultiplier >= 0.9 ? 'var(--text-dim)' : 'var(--red-bright)';
      statsHtml += `<div class="summary-renown">+${r.total} Renown</div>`;
      statsHtml += `<div class="summary-renown-breakdown">`;
      statsHtml += `<span>${r.kills} kills — ${r.baseRenown} base</span>`;
      statsHtml += `<span style="color:${speedColor}">${r.turns} turns — ${speedLabel} (x${r.speedMultiplier.toFixed(1)})</span>`;
      if (r.hasCurses) statsHtml += `<span style="color:var(--purple)">Curse bonus (x${r.curseMultiplier.toFixed(1)})</span>`;
      statsHtml += `</div>`;
    }

    statsHtml += this.engine.party.map(u => {
      const s = u.stats;
      const tag = getPrimaryTag(u.classId);
      const statLines = [];
      if (s.damageDealt > 0) statLines.push(`<span class="stat-dmg">${s.damageDealt} damage dealt</span>`);
      if (s.poisonInflicted > 0) statLines.push(`<span class="stat-poison">${s.poisonInflicted} poison inflicted</span>`);
      if (s.healingDone > 0) statLines.push(`<span class="stat-heal">${s.healingDone} healing done</span>`);
      if (s.blockGenerated > 0) statLines.push(`<span class="stat-block">${s.blockGenerated} block generated</span>`);
      if (s.moraleRestored > 0) statLines.push(`<span class="stat-morale">${s.moraleRestored} morale restored</span>`);
      if (s.damageTaken > 0) statLines.push(`<span class="stat-taken">${s.damageTaken} damage taken</span>`);

      // Build expanded detail panel (skills + equipment)
      const skillList = u.skills.map(sk => `<span class="summary-detail-skill">${sk.name}</span>`).join(', ');
      const equipItems = [];
      for (const slot of ['weapon', 'armor', 'trinket']) {
        u.equipment[slot].forEach(id => {
          if (!id) return;
          const item = getItemData(id);
          if (item) equipItems.push(`<div class="summary-detail-item"><span class="summary-detail-item-name rarity-${item.rarity}">${item.name}</span> <span class="summary-detail-item-stats">${formatItemStats(item.stats)}</span></div>`);
        });
      }
      const equipHtml = equipItems.length > 0 ? equipItems.join('') : '<span class="stat-none">No equipment</span>';

      const passiveData = CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].passive : null;
      const passiveHtml = passiveData ? `<div class="summary-detail-passive"><strong>${passiveData.name}:</strong> ${passiveData.description}</div>` : '';

      return `
        <div class="summary-unit ${u.downed ? 'downed' : ''}" data-unit-idx="${u.index}">
          <div class="summary-unit-header">
            <span class="summary-unit-title" style="color:var(--class-${tag})">${u.title}</span>
            <span class="summary-unit-name">${u.name}</span>
            <span class="summary-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp}`}</span>
            <span class="summary-expand-hint">tap to expand</span>
          </div>
          <div class="summary-unit-stats">
            ${statLines.length > 0 ? statLines.join('  ') : '<span class="stat-none">No contribution</span>'}
          </div>
          <div class="summary-unit-detail hidden">
            ${passiveHtml}
            <div class="summary-detail-section"><strong>Skills:</strong> ${skillList}</div>
            <div class="summary-detail-section"><strong>Equipment:</strong>${equipHtml}</div>
          </div>
        </div>`;
    }).join('');

    statsEl.innerHTML = statsHtml;

    // Bind click to toggle detail panels
    statsEl.querySelectorAll('.summary-unit').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const detail = el.querySelector('.summary-unit-detail');
        if (detail) {
          detail.classList.toggle('hidden');
          el.classList.toggle('expanded');
        }
      });
    });

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

    // XP bar: every encounter adds XP, skill pick granted every 3 encounters (bosses always grant)
    this.lastEncounterGrantedTraining = this.engine.addEncounterXP(isBossVictory);

    // Roll drops — filter by usability and enforce rarity caps by threat
    const threat = this.currentNodeThreat || 1;
    const difficulty = window.game ? window.game.difficulty : 1;
    const allDrops = [];
    for (const enemyId of this.engine.killedEnemies) {
      const itemId = rollDrop(enemyId, this.engine.party, difficulty);
      if (!itemId) continue;
      const item = getItemData(itemId);
      if (!item) continue;
      const canUse = this.engine.party.some(u => canEquipItem(u, item));
      if (canUse) allDrops.push(itemId);
    }

    // Rarity caps by threat: easy=1 uncommon, mid=2 uncommon, hard=2 uncommon + 1 rare
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
      // Scale item level relative to its native difficulty tier
      // March 1 items in March 3 get +2, March 3 items in March 3 get +0
      // Minimum floor: items always get at least floor((difficulty-1)/2) bonus levels
      const itemNativeDiff = item.minDifficulty || 1;
      const scaledBonusLevels = Math.max(0, difficulty - itemNativeDiff);
      const minBonusLevels = Math.max(0, Math.floor((difficulty - 1) / 2));
      const bonusLevels = Math.max(scaledBonusLevels, minBonusLevels);
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
        const bossItemId = usableBossItems[Math.floor(Math.random() * usableBossItems.length)];
        const bossItem = getItemData(bossItemId);
        const bossNativeDiff = bossItem ? (bossItem.minDifficulty || 1) : 1;
        const bossScaled = Math.max(0, difficulty - bossNativeDiff);
        const bossMin = Math.max(0, Math.floor((difficulty - 1) / 2));
        const bossBonusLevels = Math.max(bossScaled, bossMin);
        this.pendingLoot.push(bossBonusLevels > 0 ? createLeveledItem(bossItemId, bossBonusLevels) : bossItemId);
      } else {
        // No usable boss items — grant Renown instead
        this.engine.totalRenownEarned += 10;
        this.engine.addLog('No usable spoils found — +10 Renown instead.');
      }
    }

    // Event-triggered combat: override loot with the specified items (scaled)
    if (this.pendingEventCombatLoot && this.pendingEventCombatLoot.length > 0) {
      this.pendingLoot = this.pendingEventCombatLoot.map(itemId => {
        const item = getItemData(itemId);
        if (!item) return itemId;
        const itemNativeDiff = item.minDifficulty || 1;
        const scaledBonus = Math.max(0, difficulty - itemNativeDiff);
        const minBonus = Math.max(0, Math.floor((difficulty - 1) / 2));
        const bonusLevels = Math.max(scaledBonus, minBonus);
        return bonusLevels > 0 ? createLeveledItem(itemId, bonusLevels) : itemId;
      });
      this.pendingEventCombatLoot = null;
    }

    this.lootScreenFinal = isBossVictory;
    this.lootReturnToMap = !isBossVictory;

    // Boon: Arminius's Defiance — revive downed units after boss fights
    if (isBossVictory && this.engine.getActiveBoons().includes('arminius_defiance')) {
      this.engine.party.forEach(u => {
        if (u.downed) {
          u.downed = false;
          u.hp = 1;
          this.engine.addLog(`${u.name} stirs — Arminius's defiance refuses to let them fall.`);
        }
      });
    }

    this.showScreen('loot-screen');
    this.renderLootScreen();
  }

  renderLootScreen() {
    const lootText = document.getElementById('loot-text');
    const itemDisplay = document.getElementById('loot-item-display');
    const unitDisplay = document.getElementById('loot-unit-display');
    const actionsEl = document.getElementById('loot-actions');

    // XP training status
    const xp = this.engine.encounterXP;
    const xpNeeded = 3;
    const xpPips = Array.from({ length: xpNeeded }, (_, i) =>
      `<span class="xp-pip${i < xp ? ' filled' : ''}"></span>`
    ).join('');
    const trainingLine = this.lastEncounterGrantedTraining
      ? '<div class="loot-training"><span class="loot-training-text gained">Training available!</span></div>'
      : `<div class="loot-training"><span class="loot-training-text none">XP: ${xpPips}</span></div>`;

    if (this.pendingLoot.length === 0) {
      lootText.textContent = 'Nothing of value was found.';
      itemDisplay.innerHTML = trainingLine;
      unitDisplay.innerHTML = '';
      actionsEl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.textContent = this.lootScreenFinal ? 'Continue' : 'Continue March';
      btn.onclick = () => this._finishLoot();
      actionsEl.appendChild(btn);
      return;
    }

    // Show one item at a time
    if (this._currentLootIdx === undefined) this._currentLootIdx = 0;
    const itemId = this.pendingLoot[this._currentLootIdx];
    const item = getItemData(itemId);
    if (!item) { this._skipCurrentLoot(); return; }

    const eligible = this.engine.party.filter(u => canEquipItem(u, item));
    if (!this._lootUnitIdx || this._lootUnitIdx >= eligible.length) {
      // Default to first unit with a free slot for this item type
      const freeIdx = eligible.findIndex(u => u.equipment[item.slot].some(s => s === null));
      this._lootUnitIdx = freeIdx >= 0 ? freeIdx : 0;
    }

    const remaining = this.pendingLoot.length - this._currentLootIdx;
    lootText.textContent = remaining > 1 ? `${remaining} items found` : 'Item found';

    // --- Item card (top) ---
    itemDisplay.innerHTML = `
      ${trainingLine}
      <div class="loot-card rarity-${item.rarity}">
        <div class="loot-card-header">
          <span class="loot-item-name">${item.name}</span>
          <span class="loot-rarity">${item.rarity.toUpperCase()}${item.level > 1 ? ` Lv${item.level}` : ''}</span>
        </div>
        <div class="loot-item-meta">${item.slot} · ${formatItemStats(item.stats)} <span class="loot-item-tags">${renderTagPips(item.classTags)}</span></div>
        ${item.special ? `<div class="loot-item-special">${formatItemSpecial(item)}</div>` : ''}
      </div>
    `;

    // --- Unit panel (bottom) ---
    if (eligible.length === 0) {
      unitDisplay.innerHTML = '<div class="loot-no-eligible">No one can equip this item.</div>';
      actionsEl.innerHTML = '';
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn-secondary';
      skipBtn.textContent = `Skip (+${{ common: 2, uncommon: 5, rare: 10, epic: 20 }[item.rarity] || 2} Renown)`;
      skipBtn.onclick = () => this._skipCurrentLoot();
      actionsEl.appendChild(skipBtn);
      return;
    }

    const unit = eligible[this._lootUnitIdx];
    const tag = getPrimaryTag(unit.classId);
    const slots = unit.equipment[item.slot];
    const hasEmpty = slots.some(s => s === null);

    // Navigation arrows
    const prevArrow = eligible.length > 1 ? `<button class="loot-nav-arrow loot-nav-prev" id="loot-prev">◀</button>` : '';
    const nextArrow = eligible.length > 1 ? `<button class="loot-nav-arrow loot-nav-next" id="loot-next">▶</button>` : '';
    const unitCounter = eligible.length > 1 ? `<span class="loot-unit-counter">${this._lootUnitIdx + 1}/${eligible.length}</span>` : '';

    // Unit header
    const hpPct = Math.round((unit.hp / unit.maxHp) * 100);
    const hpColor = unit.downed ? 'var(--text-dim)' : hpPct > 60 ? 'var(--green-bright)' : hpPct > 30 ? 'var(--gold)' : 'var(--red-bright)';

    // Equipment in the relevant slot
    const slotItems = slots.map((id, si) => {
      const eq = id ? getItemData(id) : null;
      const selected = this._replaceSlotIdx === si;
      if (!eq) return `<div class="loot-slot-item empty">— empty —</div>`;
      // Stat diff if this slot is selected for replacement
      let diffHtml = '';
      if (selected) {
        diffHtml = this._buildStatDiff(eq.stats, item.stats);
      }
      return `<div class="loot-slot-item ${selected ? 'selected-replace' : ''} rarity-${eq.rarity}" data-slot-idx="${si}">
        <span class="loot-slot-name">${eq.name}${eq.level > 1 ? ` Lv${eq.level}` : ''}</span>
        <span class="loot-slot-stats">${formatItemStats(eq.stats)}</span>
        ${eq.special ? `<span class="loot-slot-special">${eq.special}</span>` : ''}
        ${diffHtml}
      </div>`;
    }).join('');

    // Passive ability
    const passiveHtml = unit.passive && unit.passive.name
      ? `<div class="loot-passive"><span class="loot-passive-label">Passive:</span> <span class="loot-passive-name">${unit.passive.name}</span> — ${unit.passive.description}</div>`
      : '';

    // Skills with descriptions — show how item stats affect them
    const equipDmg = (unit.equipDamage || 0);
    const equipHeal = (unit.equipHeal || 0);
    const equipBlock = (unit.equipBlock || 0);
    const equipPoison = (unit.equipPoison || 0);
    const newDmg = equipDmg + (item.stats.damage || 0);
    const newHeal = equipHeal + (item.stats.heal || 0);
    const newBlock = equipBlock + (item.stats.block || 0);
    const newPoison = equipPoison + (item.stats.poison || 0);
    // If replacing, subtract the old item's stats
    let diffDmg = item.stats.damage || 0;
    let diffHeal = item.stats.heal || 0;
    let diffBlock = item.stats.block || 0;
    let diffPoison = item.stats.poison || 0;
    if (this._replaceSlotIdx !== undefined) {
      const oldEq = getItemData(slots[this._replaceSlotIdx]);
      if (oldEq) {
        diffDmg -= (oldEq.stats.damage || 0);
        diffHeal -= (oldEq.stats.heal || 0);
        diffBlock -= (oldEq.stats.block || 0);
        diffPoison -= (oldEq.stats.poison || 0);
      }
    }
    const statChanges = [];
    if (diffDmg !== 0) statChanges.push(`<span style="color:${diffDmg > 0 ? 'var(--green-bright)' : 'var(--red-bright)'}">${diffDmg > 0 ? '+' : ''}${diffDmg} dmg</span>`);
    if (diffHeal !== 0) statChanges.push(`<span style="color:${diffHeal > 0 ? 'var(--green-bright)' : 'var(--red-bright)'}">${diffHeal > 0 ? '+' : ''}${diffHeal} heal</span>`);
    if (diffBlock !== 0) statChanges.push(`<span style="color:${diffBlock > 0 ? 'var(--green-bright)' : 'var(--red-bright)'}">${diffBlock > 0 ? '+' : ''}${diffBlock} block</span>`);
    if (diffPoison !== 0) statChanges.push(`<span style="color:${diffPoison > 0 ? 'var(--green-bright)' : 'var(--red-bright)'}">${diffPoison > 0 ? '+' : ''}${diffPoison} poison</span>`);
    const statChangeHtml = statChanges.length > 0
      ? `<div class="loot-stat-preview">${statChanges.join(' ')}</div>`
      : '';

    const skillList = unit.skills.map(s => {
      return `<div class="loot-skill-row">
        <span class="loot-skill-name">${s.name}</span>
        <span class="loot-skill-desc">${s.description}</span>
      </div>`;
    }).join('');

    // Other slots (not the one being replaced)
    const otherSlots = ['weapon', 'armor', 'trinket'].filter(s => s !== item.slot).map(slot => {
      const items = unit.equipment[slot].filter(Boolean).map(id => {
        const eq = getItemData(id);
        return eq ? `<span class="loot-other-item rarity-${eq.rarity}">${eq.name}</span>` : '';
      }).filter(Boolean).join(', ');
      return items ? `<div class="loot-other-slot"><span class="loot-other-label">${slot}:</span> ${items}</div>` : '';
    }).filter(Boolean).join('');

    unitDisplay.innerHTML = `
      <div class="loot-unit-panel">
        <div class="loot-unit-nav">
          ${prevArrow}
          <div class="loot-unit-header">
            <span class="loot-unit-name">${renderClassName(unit.classId, unit.title)} ${unit.name}</span>
            <span class="loot-unit-hp" style="color:${hpColor}">${unit.downed ? 'DOWN' : unit.hp + '/' + unit.maxHp}</span>
            ${unitCounter}
          </div>
          ${nextArrow}
        </div>
        <div class="loot-equip-totals">${this._buildEquipTotals(unit)}</div>
        ${passiveHtml}
        ${statChangeHtml}
        <div class="loot-unit-slot-title">${item.slot} slots (${slots.filter(Boolean).length}/${slots.length}):</div>
        <div class="loot-slot-list">${slotItems}</div>
        ${otherSlots ? `<div class="loot-other-slots">${otherSlots}</div>` : ''}
        <div class="loot-unit-skills-title">Skills:</div>
        <div class="loot-unit-skills">${skillList}</div>
      </div>
    `;

    // Bind navigation
    const prevBtn = document.getElementById('loot-prev');
    const nextBtn = document.getElementById('loot-next');
    if (prevBtn) prevBtn.onclick = () => { this._lootUnitIdx = (this._lootUnitIdx - 1 + eligible.length) % eligible.length; this._replaceSlotIdx = undefined; this.renderLootScreen(); };
    if (nextBtn) nextBtn.onclick = () => { this._lootUnitIdx = (this._lootUnitIdx + 1) % eligible.length; this._replaceSlotIdx = undefined; this.renderLootScreen(); };

    // Swipe support
    let touchStartX = 0;
    unitDisplay.ontouchstart = (e) => { touchStartX = e.touches[0].clientX; };
    unitDisplay.ontouchend = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40 && eligible.length > 1) {
        this._lootUnitIdx = dx > 0
          ? (this._lootUnitIdx - 1 + eligible.length) % eligible.length
          : (this._lootUnitIdx + 1) % eligible.length;
        this._replaceSlotIdx = undefined;
        this.renderLootScreen();
      }
    };

    // Bind slot click for replacement selection
    unitDisplay.querySelectorAll('.loot-slot-item[data-slot-idx]').forEach(el => {
      el.addEventListener('click', () => {
        this._replaceSlotIdx = parseInt(el.dataset.slotIdx);
        this.renderLootScreen();
      });
    });

    // --- Action buttons ---
    actionsEl.innerHTML = '';

    if (hasEmpty) {
      const equipBtn = document.createElement('button');
      equipBtn.className = 'btn-primary';
      equipBtn.textContent = `Equip on ${unit.title}`;
      equipBtn.onclick = () => this._equipCurrentLoot(unit.index);
      actionsEl.appendChild(equipBtn);
    } else if (this._replaceSlotIdx !== undefined) {
      const replacedItem = getItemData(slots[this._replaceSlotIdx]);
      const replBtn = document.createElement('button');
      replBtn.className = 'btn-primary';
      replBtn.textContent = `Replace ${replacedItem ? replacedItem.name : 'item'}`;
      replBtn.onclick = () => this._equipCurrentLoot(unit.index, this._replaceSlotIdx);
      actionsEl.appendChild(replBtn);
    } else {
      const hint = document.createElement('div');
      hint.className = 'loot-hint';
      hint.textContent = 'Tap an equipped item to replace it.';
      actionsEl.appendChild(hint);
    }

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-secondary';
    skipBtn.textContent = `Skip (+${{ common: 2, uncommon: 5, rare: 10, epic: 20 }[item.rarity] || 2} Renown)`;
    skipBtn.onclick = () => this._skipCurrentLoot();
    actionsEl.appendChild(skipBtn);
  }

  _buildEquipTotals(unit) {
    const parts = [];
    if (unit.equipDamage) parts.push(`<span class="equip-total-stat"><span class="equip-total-val">${unit.equipDamage}</span> dmg</span>`);
    if (unit.equipHeal) parts.push(`<span class="equip-total-stat"><span class="equip-total-val">${unit.equipHeal}</span> heal</span>`);
    if (unit.equipBlock) parts.push(`<span class="equip-total-stat"><span class="equip-total-val">${unit.equipBlock}</span> block</span>`);
    if (unit.equipPoison) parts.push(`<span class="equip-total-stat"><span class="equip-total-val">${unit.equipPoison}</span> poison</span>`);
    if (unit.equipExtraDice) parts.push(`<span class="equip-total-stat"><span class="equip-total-val">+${unit.equipExtraDice}</span> dice</span>`);
    return parts.length > 0 ? parts.join(' ') : '<span style="color:var(--text-dim)">No bonuses</span>';
  }

  _buildStatDiff(oldStats, newStats) {
    const allKeys = new Set([...Object.keys(oldStats), ...Object.keys(newStats)]);
    const diffs = [];
    for (const key of allKeys) {
      const oldVal = oldStats[key] || 0;
      const newVal = newStats[key] || 0;
      const diff = newVal - oldVal;
      if (diff === 0) continue;
      const color = diff > 0 ? 'var(--green-bright)' : 'var(--red-bright)';
      const sign = diff > 0 ? '+' : '';
      diffs.push(`<span style="color:${color}">${sign}${diff} ${key}</span>`);
    }
    return diffs.length > 0 ? `<div class="loot-stat-diff">${diffs.join(' ')}</div>` : '';
  }

  _equipCurrentLoot(unitIndex, replaceSlotIdx) {
    const itemId = this.pendingLoot[this._currentLootIdx];
    if (!itemId) return;
    if (replaceSlotIdx !== undefined) {
      const item = getItemData(itemId);
      this.engine.unequipSlot(unitIndex, item.slot, replaceSlotIdx);
    }
    const success = this.engine.equipItem(unitIndex, itemId);
    if (success) {
      this.pendingLoot.splice(this._currentLootIdx, 1);
      this._replaceSlotIdx = undefined;
      this._lootUnitIdx = 0;
      if (this.pendingLoot.length === 0 || this._currentLootIdx >= this.pendingLoot.length) {
        this._currentLootIdx = 0;
      }
      this.renderLootScreen();
    }
  }

  _skipCurrentLoot() {
    const itemId = this.pendingLoot[this._currentLootIdx];
    if (itemId) {
      const item = getItemData(itemId);
      const renown = { common: 2, uncommon: 5, rare: 10, epic: 20 }[item ? item.rarity : 'common'] || 2;
      this.engine.totalRenownEarned += renown;
    }
    this.pendingLoot.splice(this._currentLootIdx, 1);
    this._replaceSlotIdx = undefined;
    this._lootUnitIdx = 0;
    if (this._currentLootIdx >= this.pendingLoot.length) this._currentLootIdx = 0;
    this.renderLootScreen();
  }

  _finishLoot() {
    // Convert any remaining items to Renown
    const renownPerRarity = { common: 2, uncommon: 5, rare: 10, epic: 20 };
    this.pendingLoot.forEach(itemId => {
      const item = getItemData(itemId);
      if (item) this.engine.totalRenownEarned += renownPerRarity[item.rarity] || 2;
    });
    this.pendingLoot = [];
    this._currentLootIdx = undefined;
    this._lootUnitIdx = 0;
    this._replaceSlotIdx = undefined;
    if (this.engine.pendingSkillPicks > 0) {
      this.showLevelUpScreen();
    } else if (this.lootScreenFinal) {
      this.showPostBossChoice();
    } else {
      this.showMapScreen();
    }
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
      ${item.special ? `<div class="item-tooltip-special">${formatItemSpecial(item)}</div>` : ''}
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
    this._currentLootIdx = lootIndex;
    this._equipCurrentLoot(unitIndex);
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
        btn.innerHTML = `${renderClassName(u.classId, u.title)} ${u.name} (${u.skills.length}/${MAX_SKILLS} skills)`;
        btn.addEventListener('click', () => this.showSkillChoices(u.index));
      } else {
        btn.innerHTML = `${renderClassName(u.classId, u.title)} ${u.name} — Train Stat`;
        btn.addEventListener('click', () => this.showStatChoices(u.index));
      }
      content.appendChild(btn);
    });
  }

  showSkillChoices(unitIndex) {
    const content = document.getElementById('levelup-content');
    const unit = this.engine.party[unitIndex];
    // Cache choices per unit so switching between units doesn't reroll
    if (!this._cachedSkillChoicesMap) this._cachedSkillChoicesMap = {};
    if (!this._cachedSkillChoicesMap[unitIndex]) {
      this._cachedSkillChoicesMap[unitIndex] = this.engine.getSkillChoices(unit, 2);
    }
    const choices = this._cachedSkillChoicesMap[unitIndex];

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
        this._cachedSkillChoicesMap = null;
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

  showStatChoices(unitIndex) {
    const content = document.getElementById('levelup-content');
    const unit = this.engine.party[unitIndex];
    const tags = CLASS_DATA[unit.classId].tags;

    // Scaling stat amounts based on difficulty
    const diff = window.game ? window.game.difficulty : 1;
    const hpAmount = 3 + Math.floor(diff / 2);
    const statAmount = 1 + Math.floor(diff / 4);

    // Build stat options based on class tags and class identity
    const cid = unit.classId;
    const options = [
      { key: 'hp', label: `+${hpAmount} Max HP`, desc: 'Toughen up.', color: 'var(--red-bright)', amount: hpAmount },
    ];
    // Damage: melee, ranged, elite, cornicen (7 damage skills), centurion (4 damage skills)
    if (tags.includes('melee') || tags.includes('ranged') || tags.includes('elite') || cid === 'cornicen' || cid === 'centurion') {
      options.push({ key: 'damage', label: `+${statAmount} Damage`, desc: 'Hit harder.', color: 'var(--red-bright)', amount: statAmount });
    }
    // Block: command, melee, ballistarius (Brace Position, Burning Pitch)
    if (tags.includes('command') || tags.includes('melee') || cid === 'ballistarius') {
      options.push({ key: 'block', label: `+${statAmount} Block`, desc: 'Tougher defense.', color: 'var(--blue-bright)', amount: statAmount });
    }
    // Heal: support, signifer (Eagle's Blessing, revive)
    if (tags.includes('support') || cid === 'signifer') {
      options.push({ key: 'heal', label: `+${statAmount} Heal`, desc: 'Stronger mending.', color: 'var(--green-bright)', amount: statAmount });
    }
    // Poison: medicus, wulfswestr, arcania, sagittarius (3 poison skills)
    if (cid === 'medicus' || cid === 'wulfswestr' || cid === 'arcania' || cid === 'sagittarius') {
      options.push({ key: 'poison', label: `+${statAmount} Poison`, desc: 'Deadlier toxins.', color: '#8a4', amount: statAmount });
    }

    // Randomly pick 2 options from the pool
    const shuffled = options.sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 2);

    document.getElementById('levelup-desc').textContent = `${unit.name} — choose a training bonus:`;
    content.innerHTML = '';

    picks.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-primary levelup-unit-btn';
      btn.innerHTML = `<span style="color:${opt.color}">${opt.label}</span> <span style="font-size:0.75rem;opacity:0.7">${opt.desc}</span>`;
      btn.addEventListener('click', () => {
        const amt = opt.amount;
        if (opt.key === 'hp') {
          unit.maxHp += amt; unit.baseMaxHp += amt; unit.hp += amt;
          this.engine.addLog(`${unit.name} toughens up! (+${amt} max HP)`);
        } else if (opt.key === 'damage') {
          unit.bonusDamage = (unit.bonusDamage || 0) + amt;
          this.engine.computeEquipmentStats(unit);
          this.engine.addLog(`${unit.name} trains offense! (+${amt} Damage)`);
        } else if (opt.key === 'block') {
          unit.bonusBlock = (unit.bonusBlock || 0) + amt;
          this.engine.computeEquipmentStats(unit);
          this.engine.addLog(`${unit.name} trains defense! (+${amt} Block)`);
        } else if (opt.key === 'heal') {
          unit.bonusHeal = (unit.bonusHeal || 0) + amt;
          this.engine.computeEquipmentStats(unit);
          this.engine.addLog(`${unit.name} studies medicine! (+${amt} Heal)`);
        } else if (opt.key === 'poison') {
          unit.bonusPoison = (unit.bonusPoison || 0) + amt;
          this.engine.computeEquipmentStats(unit);
          this.engine.addLog(`${unit.name} brews deadlier toxins! (+${amt} Poison)`);
        }
        this.engine.pendingSkillPicks--;
        if (this.engine.pendingSkillPicks > 0) {
          this.showLevelUpScreen();
        } else {
          this.afterLevelUps();
        }
      });
      content.appendChild(btn);
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.textContent = 'Back';
    backBtn.style.marginTop = '12px';
    backBtn.addEventListener('click', () => this.showLevelUpScreen());
    content.appendChild(backBtn);
  }

  showPostBossChoice() {
    if (window.game) window.game.trackRunEnd(true);
    this.showScreen('run-complete-screen');

    const diff = window.game.difficulty || 1;
    const marchLabel = diff === 1 ? 'First March' : `March ${diff}`;

    // Check if this was the final boss (march 10 - spirits defeated)
    const isFinalVictory = diff >= 10 && this.engine.enemies &&
      this.engine.enemies.some(e => e.id === 'spirit_of_arminius' || e.id === 'spirit_of_varus');

    document.getElementById('run-complete-title').textContent = isFinalVictory ? 'THE FOREST IS SILENCED' : 'VICTORY';
    document.getElementById('run-complete-text').textContent = isFinalVictory
      ? 'The spirits of Arminius and Varus dissolve into the mist. The forest releases its grip. After ten marches through darkness, your cohort has broken the curse of Teutoburg. Rome will remember what you did here.'
      : `Your cohort has defeated the Champion and broken through. The forest grows darker ahead, but there is still work to be done. Will you press on?`;

    const statsEl = document.getElementById('run-complete-stats');
    let html = '<div class="run-summary-section">';
    html += `<div class="run-summary-stat"><span class="run-summary-label">${marchLabel} Complete</span><span class="run-summary-value"></span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Encounters Completed</span><span class="run-summary-value">${this.engine.encountersCompleted}</span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Enemies Defeated</span><span class="run-summary-value">${this.engine.totalEnemiesKilled}</span></div>`;
    html += `<div class="run-summary-stat renown-stat"><span class="run-summary-label">Renown Earned</span><span class="run-summary-value renown-value">+${this.engine.totalRenownEarned}</span></div>`;
    html += '</div>';

    html += this.engine.party.map(u => {
      return `<div class="run-complete-unit">
        <span class="run-complete-unit-name">${renderClassName(u.classId, u.title)} ${u.name}</span>
        <span class="run-complete-unit-hp">${u.downed ? 'FALLEN' : `${u.hp}/${u.maxHp} HP`}</span>
        <span class="run-complete-unit-level">${u.skills.length} skills</span>
      </div>`;
    }).join('');

    statsEl.innerHTML = html;

    // Save renown
    window.game.addRunRenown(this.engine.totalRenownEarned);
    // Reset run renown counter so it doesn't double-count
    this.engine.totalRenownEarned = 0;

    const btnContainer = document.getElementById('btn-run-complete');
    let homeBtn = document.getElementById('btn-run-home');
    if (!homeBtn) {
      homeBtn = document.createElement('button');
      homeBtn.id = 'btn-run-home';
      homeBtn.className = 'btn-secondary';
      btnContainer.parentElement.appendChild(homeBtn);
    }

    if (isFinalVictory) {
      // Final victory: only return home
      btnContainer.textContent = 'Return Home';
      btnContainer.onclick = () => window.game.returnHome();
      homeBtn.classList.add('hidden');
    } else {
      // Normal boss: continue or return
      btnContainer.textContent = 'Deeper into the Forest';
      btnContainer.onclick = () => this.showMarchRestScreen();
      homeBtn.textContent = 'Return Home';
      homeBtn.classList.remove('hidden');
      homeBtn.onclick = () => {
        homeBtn.classList.add('hidden');
        window.game.returnHome();
      };
    }
  }

  showMarchRestScreen() {
    // Brief rest: heal 10% of all members
    this.engine.party.forEach(u => {
      if (!u.downed) {
        const healAmt = Math.max(1, Math.floor(u.maxHp * 0.1));
        u.hp = Math.min(u.maxHp, u.hp + healAmt);
      }
    });

    this.showScreen('event-screen');
    document.getElementById('event-title').textContent = 'BRIEF RESPITE';
    document.getElementById('event-intro').textContent = 'Your cohort rests briefly before pressing deeper. Wounds are tended, and there is time to hone your edge.';
    document.getElementById('event-intro').style.whiteSpace = 'pre-line';
    document.getElementById('event-outcome').classList.add('hidden');

    // Show party HP
    let statusEl = document.getElementById('camp-party-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'camp-party-status';
      const introEl = document.getElementById('event-intro');
      introEl.parentNode.insertBefore(statusEl, introEl.nextSibling);
    }
    const moraleBand = getMoraleBand(this.engine.morale);
    let statusHtml = `<div class="camp-morale">Morale: <span style="color:${moraleBand.color}">${this.engine.morale} (${moraleBand.label})</span> | All soldiers healed 10%</div>`;
    statusHtml += '<div class="camp-units">';
    this.engine.party.forEach(u => {
      const tag = getPrimaryTag(u.classId);
      const hpPct = Math.round((u.hp / u.maxHp) * 100);
      const hpColor = hpPct > 60 ? 'var(--green-bright)' : hpPct > 30 ? 'var(--gold)' : 'var(--red-bright)';
      statusHtml += `<div class="camp-unit-status"><span class="camp-unit-name" style="color:var(--class-${tag})">${u.title}</span><span class="camp-unit-hp" style="color:${hpColor}">${u.downed ? 'FALLEN' : u.hp + '/' + u.maxHp}</span><div class="camp-hp-bar"><div class="camp-hp-fill" style="width:${u.downed ? 0 : hpPct}%;background:${hpColor}"></div></div></div>`;
    });
    statusHtml += '</div>';
    statusEl.innerHTML = statusHtml;

    // Randomly choose: item upgrades or skill upgrades
    const upgradeType = Math.random() < 0.5 ? 'item' : 'skill';
    this._marchRestUpgradesLeft = 2;

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    if (upgradeType === 'item') {
      this.showMarchRestItemUpgrades(choicesEl);
    } else {
      this.showMarchRestSkillUpgrades(choicesEl);
    }
  }

  showMarchRestItemUpgrades(choicesEl) {
    // Gather all equipped items, spread across characters
    const allItems = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (!id) return;
            const item = getItemData(id);
            if (item && !item.stats.extraDice) allItems.push({ unit: u, itemId: id, item });
          });
        }
      }
    });

    // Spread selection across characters
    const selected = [];
    const usedUnits = new Set();
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    // First pass: one per unit
    for (const entry of shuffled) {
      if (selected.length >= 5) break;
      if (!usedUnits.has(entry.unit.index)) {
        selected.push(entry);
        usedUnits.add(entry.unit.index);
      }
    }
    // Second pass: fill remaining
    for (const entry of shuffled) {
      if (selected.length >= 5) break;
      if (!selected.includes(entry)) selected.push(entry);
    }

    if (selected.length === 0) {
      choicesEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">No equipment to improve.</div>';
      this.addMarchRestContinue(choicesEl);
      return;
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'march-rest-subtitle';
    titleEl.textContent = `Choose ${this._marchRestUpgradesLeft} items to upgrade:`;
    choicesEl.appendChild(titleEl);

    selected.forEach(({ unit, itemId, item }) => {
      const stats = item.stats;
      const statKeys = Object.keys(stats).filter(k => k !== 'extraDice' && stats[k] >= 0);
      if (statKeys.length === 0) return;
      const statKey = statKeys[Math.floor(Math.random() * statKeys.length)];
      const current = stats[statKey];
      const next = current + 1;
      const currentLevel = item.level || 1;
      const statLabel = { damage: 'Damage', block: 'Block', maxHp: 'HP', heal: 'Heal', poison: 'Poison' }[statKey] || statKey;
      const upgradeText = `Lv${currentLevel} → ${currentLevel + 1}: ${statLabel} ${current} → ${next}`;
      const tag = getPrimaryTag(unit.classId);
      const baseName = item.baseId ? (ITEM_DATA[item.baseId] ? ITEM_DATA[item.baseId].name : item.name) : item.name.replace(/ \+\d+$/, '');

      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong class="rarity-${item.rarity}">${item.name}</strong> <span style="font-size:0.65rem;color:var(--text-dim)">(${item.rarity})</span><br><span style="font-size:0.75rem;color:var(--text-dim)">${formatItemStats(stats)}</span><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;
      btn.addEventListener('click', () => {
        ITEM_DATA[itemId].stats[statKey]++;
        ITEM_DATA[itemId].level = currentLevel + 1;
        ITEM_DATA[itemId].name = baseName + ' +' + currentLevel;
        if (!ITEM_DATA[itemId].baseId) ITEM_DATA[itemId].baseId = itemId;
        if (statKey === 'maxHp') { unit.maxHp++; unit.baseMaxHp++; unit.hp++; }
        this.engine.computeEquipmentStats(unit);

        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        this._marchRestUpgradesLeft--;
        if (this._marchRestUpgradesLeft <= 0) {
          choicesEl.querySelectorAll('.btn-event-choice').forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.4'; });
          this.addMarchRestContinue(choicesEl);
        }
      });
      choicesEl.appendChild(btn);
    });
  }

  showMarchRestSkillUpgrades(choicesEl) {
    // Gather upgradeable skills spread across characters
    const allSkills = [];
    this.engine.party.forEach(u => {
      if (!u.downed) {
        u.skills.forEach(s => {
          const baseDef = u.allSkills.find(as => as.id === s.id);
          if (!baseDef || !baseDef.effects) return;
          const eff = baseDef.effects;
          if (eff.damage || eff.heal || eff.healAll || eff.block || eff.blockAll || eff.poison || eff.poisonAll || eff.morale || eff.damageAll || eff.buffAllies) {
            allSkills.push({ unit: u, skill: s, baseDef });
          }
        });
      }
    });

    const selected = [];
    const usedUnits = new Set();
    const shuffled = allSkills.sort(() => Math.random() - 0.5);
    for (const entry of shuffled) {
      if (selected.length >= 5) break;
      if (!usedUnits.has(entry.unit.index)) {
        selected.push(entry);
        usedUnits.add(entry.unit.index);
      }
    }
    for (const entry of shuffled) {
      if (selected.length >= 5) break;
      if (!selected.includes(entry)) selected.push(entry);
    }

    if (selected.length === 0) {
      choicesEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">No skills to improve.</div>';
      this.addMarchRestContinue(choicesEl);
      return;
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'march-rest-subtitle';
    titleEl.textContent = `Choose ${this._marchRestUpgradesLeft} skills to upgrade:`;
    choicesEl.appendChild(titleEl);

    selected.forEach(({ unit, skill, baseDef }) => {
      const eff = baseDef.effects;
      let upgradeText = '';
      if (eff.damage) upgradeText = `+1 damage (${eff.damage} → ${eff.damage + 1})`;
      else if (eff.heal) upgradeText = `+1 healing (${eff.heal} → ${eff.heal + 1})`;
      else if (eff.healAll) upgradeText = `+1 healing to all (${eff.healAll} → ${eff.healAll + 1})`;
      else if (eff.block) upgradeText = `+1 block (${eff.block} → ${eff.block + 1})`;
      else if (eff.blockAll) upgradeText = `+1 block to all (${eff.blockAll} → ${eff.blockAll + 1})`;
      else if (eff.poison) upgradeText = `+1 poison (${eff.poison} → ${eff.poison + 1})`;
      else if (eff.poisonAll) upgradeText = `+1 poison to all (${eff.poisonAll} → ${eff.poisonAll + 1})`;
      else if (eff.morale) upgradeText = `+3 morale (${eff.morale} → ${eff.morale + 3})`;
      else if (eff.damageAll) upgradeText = `+1 damage to all (${eff.damageAll} → ${eff.damageAll + 1})`;
      else if (eff.buffAllies) upgradeText = `+1 buff damage (${eff.buffAllies.bonusDamage} → ${eff.buffAllies.bonusDamage + 1})`;
      else { const key = Object.keys(eff).find(k => typeof eff[k] === 'number'); if (key) upgradeText = `+1 ${key} (${eff[key]} → ${eff[key] + 1})`; }

      const tag = getPrimaryTag(unit.classId);
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<span style="color:var(--class-${tag})">${unit.title}</span> — <strong>${skill.name}</strong><br><span style="font-size:0.75rem;color:var(--gold)">${upgradeText}</span>`;
      btn.addEventListener('click', () => {
        if (eff.damage) baseDef.effects.damage++;
        else if (eff.heal) baseDef.effects.heal++;
        else if (eff.healAll) baseDef.effects.healAll++;
        else if (eff.block) baseDef.effects.block++;
        else if (eff.blockAll) baseDef.effects.blockAll++;
        else if (eff.poison) baseDef.effects.poison++;
        else if (eff.poisonAll) baseDef.effects.poisonAll++;
        else if (eff.morale) baseDef.effects.morale += 3;
        else if (eff.damageAll) baseDef.effects.damageAll++;
        else if (eff.buffAllies) baseDef.effects.buffAllies.bonusDamage++;

        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        this._marchRestUpgradesLeft--;
        if (this._marchRestUpgradesLeft <= 0) {
          choicesEl.querySelectorAll('.btn-event-choice').forEach(b => { b.style.pointerEvents = 'none'; b.style.opacity = '0.4'; });
          this.addMarchRestContinue(choicesEl);
        }
      });
      choicesEl.appendChild(btn);
    });
  }

  addMarchRestContinue(choicesEl) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn-primary';
    continueBtn.textContent = 'March On';
    continueBtn.style.marginTop = '12px';
    continueBtn.addEventListener('click', () => {
      // Clean up camp status if present
      const statusEl = document.getElementById('camp-party-status');
      if (statusEl) statusEl.innerHTML = '';
      window.game.continueRun();
    });
    choicesEl.appendChild(continueBtn);
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
        <span class="run-complete-unit-name">${renderClassName(u.classId, u.title)} ${u.name}</span>
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
