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
    this.encounterXP = 0; // XP bar: grants skill pick every 3 encounters
    this.skillUsageStats = {}; // track skill usage for analytics
    this.runKilledBosses = []; // boss IDs killed this run (for final boss spectral images)
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
        equipment: {
          weapon: Array(data.equipSlots ? data.equipSlots.weapon : 2).fill(null),
          armor: Array(data.equipSlots ? data.equipSlots.armor : 2).fill(null),
          trinket: Array(data.equipSlots ? data.equipSlots.trinket : 3).fill(null),
        },
        equipDamage: 0, equipBlock: 0, equipHeal: 0, equipExtraDice: 0, equipPoison: 0,
        bonusDamage: 0, bonusBlock: 0, bonusHeal: 0, bonusPoison: 0,
        stats: { damageDealt: 0, healingDone: 0, blockGenerated: 0, blockAbsorbed: 0, moraleRestored: 0, damageTaken: 0, poisonInflicted: 0, poisonDamageDealt: 0 },
        runStats: { damageDealt: 0, healingDone: 0, blockGenerated: 0, blockAbsorbed: 0, moraleRestored: 0, damageTaken: 0, poisonInflicted: 0, poisonDamageDealt: 0 },
      };
    });
    this.party.forEach(u => this.initSkills(u));
  }

  initEncounter(encounterDef) {
    this._encounterDef = encounterDef;
    this.enemyDefs = encounterDef.enemies;
    this.enemies = [];
    this.spawnIndex = 0;
    this.turn = 0;
    this.turnCount = 0;
    this.log = [];
    this.phase = PHASE.PRE_COMBAT;
    this.currentEncounterDef = encounterDef;
    this.isAmbush = !!encounterDef.isAmbush;
    this.targetMode = null;
    // Reset epic item combat flags
    this._heartwoodTriggered = false;
    this._heartwoodBonusDice = 0;
    this._lupaFangUsed = false;
    this._eagleUsed = false;
    this._marsSkillCount = 0;
    this._aquilaCuirassUsed = false;
    this._totalSkillsUsed = 0;
    this._spectralQueue = null; // Reset per-fight, but _runSpectralDefeated persists
    this._spectralSpawnedThisFight = 0;
    this.killedEnemies = [];
    this.party.forEach(u => {
      // Preserve camp-granted block and buffs, only reset combat-specific state
      u.taunt = false;
      u.poison = 0;
      u.passiveTriggered = false;
      u._wolfPeltUsed = false;
      u._mushroomRage = 0;
      u._ironVanguardUsed = false;
      u._intNetUsed = false;
      u._bardigUsed = false;
      u._poisonOnAttack = null;
      u._untargetable = false;
      u._contingency = false;
      u._divineRetribution = 0;
      u.skills.forEach(s => { s.cooldownLeft = 0; });
      u.actedThisTurn = false;
      // Accumulate into run-wide stats before resetting
      if (u.runStats) {
        for (const key of Object.keys(u.stats)) {
          u.runStats[key] = (u.runStats[key] || 0) + (u.stats[key] || 0);
        }
      }
      u.stats = { damageDealt: 0, healingDone: 0, blockGenerated: 0, blockAbsorbed: 0, moraleRestored: 0, damageTaken: 0, poisonInflicted: 0, poisonDamageDealt: 0 };
      if (u.passive) u.passive.triggered = false;
      this.computeEquipmentStats(u);
    });

    // Special: Raider's Shield — start each combat with 6 block (scales with level)
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'raider_shield')) {
        const lv = this.getItemLevel(u, 'raider_shield');
        const shieldBlock = 6 + (lv - 1) * 2;
        u.block = (u.block || 0) + shieldBlock;
        this.addLog(`${u.name}'s Raider's Shield grants ${shieldBlock} Block.`);
      }
    });

    // Special: Lorica of the Damned — start combat with block equal to 20% max HP
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'lorica_of_the_damned')) {
        const ldLv = this.getItemLevel(u, 'lorica_of_the_damned');
        const loricaBlock = Math.floor(u.maxHp * (0.2 + ldLv * 0.03));
        u.block = (u.block || 0) + loricaBlock;
        this.addLog(`${u.name}'s Lorica of the Damned grants ${loricaBlock} Block.`);
      }
    });

    // Special: Gilded Cuirass — start combat with Block equal to total training sessions
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'gilded_cuirass') && (u._trainingCount || 0) > 0) {
        const cuirassBlock = u._trainingCount;
        u.block = (u.block || 0) + cuirassBlock;
        this.addLog(`${u.name}'s Gilded Cuirass grants ${cuirassBlock} Block from training.`);
      }
    });

    // Special: War Hound Collar — apply 2 poison to a random enemy at combat start
    if (this.partyHasItem('hound_collar')) {
      // Deferred — enemies aren't spawned yet during initEncounter
      this._houndCollarPending = true;
    }

    // Special: Arm Ring of Arminius — +5 morale at encounter start
    if (this.partyHasItem('arm_ring_of_arminius')) {
      this.morale = Math.min(100, this.morale + 5);
      this.addLog('The Arm Ring of Arminius fills the men with defiance. (+5 Morale)');
    }

    // Special: Centurion's Whistle — +3 morale at combat start
    if (this.partyHasItem('centurions_whistle')) {
      this.morale = Math.min(100, this.morale + 3);
      this.addLog("The Centurion's Whistle steadies the men. (+3 Morale)");
    }

    // Special: Ivory Warhorn — +5 morale at combat start
    if (this.partyHasItem('ivory_warhorn')) {
      this.morale = Math.min(100, this.morale + 5);
      this.addLog('The Ivory Warhorn sounds — the men rally! (+5 Morale)');
    }

    // Curse: Death's Whisper — start each encounter at -5 morale
    if (this.getActiveCurses().includes('deaths_whisper')) {
      this.morale = Math.max(0, this.morale - 5);
      this.addLog("Death's whisper chills the air. (-5 Morale)");
    }
    this.clampMorale();

    this.addLog(encounterDef.intro);
  }

  beginSpawning() {
    this.phase = PHASE.SPAWNING;
    this.spawnIndex = 0;
    this.spawnNextEnemy();
  }

  spawnNextEnemy() {
    if (this.spawnIndex >= this.enemyDefs.length) {
      // Ambush: enemies strike first before the player gets dice
      if (this.isAmbush) {
        this.isAmbush = false;
        this._ambushDamageHalved = true; // enemies deal half damage this turn
        this._ambushTargeted = new Set(); // spread targets during ambush
        this._ambushStunCount = 0; // limit stuns during ambush turn
        this.addLog('AMBUSH! The enemy strikes before you can react!');
        this.phase = PHASE.ENEMY_TURN;
        this.update();
        setTimeout(() => this.executeEnemyTurn(), 600);
        return;
      }
      // War Hound Collar: apply poison to a random enemy (scales with level)
      if (this._houndCollarPending) {
        this._houndCollarPending = false;
        const alive = this.enemies.filter(e => !e.dead);
        if (alive.length > 0) {
          const hcLv = this.getPartyItemLevel('hound_collar');
          const hcPoison = 2 + (hcLv - 1);
          const victim = alive[Math.floor(Math.random() * alive.length)];
          victim.poison = (victim.poison || 0) + hcPoison;
          this.addLog(`War Hound's spirit strikes — ${victim.name} is poisoned! (+${hcPoison} Poison)`);
        }
      }
      // Grove Witch: spawn a healing totem at encounter start
      if (this._encounterDef && this._encounterDef.spawnHealingTotem) {
        const witch = this.enemies.find(e => e.id === 'grove_witch' && !e.dead);
        if (witch) this.spawnHealingTotem(witch);
      }
      // Germanic Warlord: starts with block equal to highest equipBlock in party
      const warlordStart = this.enemies.find(e => e.id === 'arminius_champion' && !e.dead);
      if (warlordStart) {
        const highestBlock = Math.max(...this.party.map(u => u.equipBlock || 0));
        if (highestBlock > 0) {
          warlordStart.block = (warlordStart.block || 0) + highestBlock;
          this.addLog(`${warlordStart.name} wears stolen Roman armor! (+${highestBlock} Block)`);
        }
      }

      // Serpent Shaman: starts with block equal to highest equipPoison in party
      const shamanStart = this.enemies.find(e => e.id === 'serpent_shaman' && !e.dead);
      if (shamanStart) {
        const highestPoison = Math.max(...this.party.map(u => u.equipPoison || 0));
        if (highestPoison > 0) {
          shamanStart.block = (shamanStart.block || 0) + highestPoison;
          this.addLog(`${shamanStart.name}'s scales shimmer with stolen venom! (+${highestPoison} Block)`);
        }
      }

      // Apply boon effects at combat start
      const boons = this.getActiveBoons();
      if (boons.includes('serpent_blessing')) {
        this.enemies.forEach(e => { if (!e.dead) e.poison = (e.poison || 0) + 2; });
        this.addLog("Serpent's Blessing — all enemies start poisoned!");
      }
      if (boons.includes('stag_vigor')) {
        this.party.forEach(u => { if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + 2); });
        this.addLog("Stag's Vigor — all soldiers heal 2 HP!");
      }
      if (boons.includes('demigods_shield')) {
        this.party.forEach(u => { if (!u.downed) u.block = (u.block || 0) + 3; });
        this.addLog("Demigod's Shield — all soldiers gain 3 Block!");
      }
      if (boons.includes('first_blood')) {
        this.party.forEach(u => { if (!u.downed) u.buffs.push({ damage: 2, attacksLeft: 99 }); });
        this._firstBloodTurn = 2; // remove after 2 turns
      }
      if (boons.includes('varus_lesson') || boons.includes('cavalry_speed')) {
        this._boonBonusDice = (this._boonBonusDice || 0) + 1;
      }
      if (boons.includes('scouts_blessing')) {
        this.party.forEach(u => { if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + 2); });
        this.addLog("Scout's Blessing — all soldiers heal 2 HP!");
      }
      if (boons.includes('standard_march')) {
        this.morale = Math.min(100, this.morale + 3);
        this.addLog("Standard Bearer's March — +3 Morale!");
      }
      if (boons.includes('fog_piercer')) {
        this.party.forEach(u => { if (!u.downed) u.block = (u.block || 0) + 3; });
        this.addLog("Fog Piercer — all soldiers gain 3 Block!");
      }
      this.addLog('Prepare yourselves!');
      this.startRollPhase();
      return;
    }
    const eid = this.enemyDefs[this.spawnIndex];
    const data = ENEMY_DATA[eid];
    // Difficulty scaling: HP, damage, poison, and block scale per difficulty above 1
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    let scaledMaxHp = Math.round(data.maxHp * this.getHpScale(diffBonus));
    // Curse: Champion's Mark — bosses have +20% HP
    if (data.isBoss && this.getActiveCurses().includes('champions_mark')) {
      scaledMaxHp = Math.round(scaledMaxHp * 1.2);
    }
    const blockScale = 1.25;
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
      poisonTarget: a.poisonTarget ? a.poisonTarget + diffBonus : undefined,
      blockAllEnemies: a.blockAllEnemies ? Math.round((a.blockAllEnemies + diffBonus) * blockScale) : undefined,
      blockFrontRow: a.blockFrontRow ? Math.round((a.blockFrontRow + diffBonus) * blockScale) : undefined,
      blockSelf: a.blockSelf ? Math.round((a.blockSelf + diffBonus) * blockScale) : undefined,
      healSelf: a.healSelf ? Math.round(a.healSelf * (1 + diffBonus * 0.25)) : undefined,
      healAlly: a.healAlly ? Math.round(a.healAlly * (1 + diffBonus * 0.25)) : undefined,
      healBoss: a.healBoss ? Math.round(a.healBoss * (1 + diffBonus * 0.25)) : undefined,
    }));
    // Determine starting block from blockSelf action (e.g., Cheruscan Guardian) or flat startBlock
    let startBlock = data.startBlock ? Math.round((data.startBlock + diffBonus) * blockScale) : 0;
    if (data.startWithSelfBlock) {
      const selfBlockAction = scaledActions.find(a => a.blockSelf);
      if (selfBlockAction) startBlock = selfBlockAction.blockSelf;
    }
    const enemy = {
      index: this.spawnIndex,
      ...data,
      maxHp: scaledMaxHp,
      hp: scaledMaxHp,
      actions: scaledActions,
      dead: false,
      poison: 0,
      block: startBlock,
      justSpawned: true,
    };
    // Scale passive effects with difficulty
    if (enemy.turnDamageAll) enemy.turnDamageAll = Math.round(enemy.turnDamageAll * (1 + diffBonus * 0.35));
    if (enemy.deathDamageEnemy) enemy.deathDamageEnemy = Math.round(enemy.deathDamageEnemy * (1 + diffBonus * 0.35));
    if (enemy.aura && enemy.aura.damageReduction) {
      enemy.aura = { ...enemy.aura, damageReduction: enemy.aura.damageReduction + diffBonus };
    }
    this.enemies.push(enemy);
    // Ironbound Champion: starts with block equal to half HP
    if (data.id === 'ironbound_champion') {
      const ironBlock = Math.floor(enemy.maxHp / 2);
      enemy.block += ironBlock;
      startBlock += ironBlock;
    }
    // Fog Illusion: starts with block equal to HP
    if (data.id === 'fog_illusion') {
      enemy.block += enemy.maxHp;
      startBlock += enemy.maxHp;
    }

    this.addLog(`${enemy.name} appears!${startBlock > 0 ? ` (${startBlock} Block)` : ''}`);

    // Runecarver: grant block to all other enemies when spawning (scales with difficulty)
    if (data.startBlockAllEnemies) {
      const scaledStartBlock = data.startBlockAllEnemies + diffBonus;
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + scaledStartBlock;
        }
      });
      this.addLog(`${enemy.name} carves runes — all enemies gain ${scaledStartBlock} Block!`);
    }

    // Corpse of Varus: copy one non-starter ability from each party member
    if (data.id === 'corpse_of_varus') {
      const stolenActions = [];
      this.party.forEach(u => {
        const nonStarter = u.allSkills.filter(s => !s.starter && u.skills.some(sk => sk.id === s.id));
        if (nonStarter.length > 0) {
          const stolen = nonStarter[Math.floor(Math.random() * nonStarter.length)];
          // Convert player skill to an enemy action
          const baseDmg = stolen.effects.damage || stolen.effects.damageAll || 0;
          const scaledDmg = Math.max(3, Math.round(baseDmg * (1 + diffBonus * 0.35)));
          stolenActions.push({
            name: `Stolen: ${stolen.name}`,
            damage: scaledDmg,
            chance: 0.15,
            text: `mimics ${u.name}'s ${stolen.name} with twisted precision`,
            ignoreRow: !!stolen.ignoreRow,
            cooldown: 2,
          });
        }
      });
      if (stolenActions.length > 0) {
        enemy.actions.push(...stolenActions);
        this.addLog(`${enemy.name} studies your soldiers — he learns their techniques!`);
      }
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
    this.log.push(typeof text === 'string' ? text : String(text));
    if (this.log.length > 50) this.log.shift();
  }

  // --- Phase management ---
  // Calculate renown earned from a completed encounter (returns breakdown object)
  calculateRenown() {
    const baseRenown = this.killedEnemies.reduce((sum, eid) => {
      const data = ENEMY_DATA[eid];
      return sum + (data ? (data.xpValue || 0) * 2 : 0);
    }, 0);
    const speedMultiplier = Math.max(0.5, 1.5 - (this.turnCount * 0.1));
    const activeCurses = this.getActiveCurses();
    const curseBonus = activeCurses.reduce((sum, cid) => {
      const def = typeof CURSE_DEFS !== 'undefined' ? CURSE_DEFS.find(c => c.id === cid) : null;
      return sum + (def ? def.renown / 100 : 0.15);
    }, 0);
    const curseMultiplier = 1 + curseBonus;
    const total = Math.round(baseRenown * speedMultiplier * curseMultiplier);
    return {
      total,
      baseRenown,
      kills: this.killedEnemies.length,
      turns: this.turnCount,
      speedMultiplier,
      curseMultiplier,
      hasCurses: activeCurses.length > 0,
    };
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

    // Clear per-turn flags
    this.party.forEach(u => {
      u._untargetable = false;
      u._contingency = false;
    });

    // Poison ticks moved: ally poison at end of player turn, enemy poison at end of enemy turn

    // Structure aura damage (Wicker Man: turnDamageAll)
    this.enemies.forEach(e => {
      if (!e.dead && e.turnDamageAll) {
        this.party.forEach(u => {
          if (!u.downed) {
            u.hp = Math.max(0, u.hp - e.turnDamageAll);
            u.stats.damageTaken += e.turnDamageAll;
            if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: e.turnDamageAll, type: 'burn' });
          }
        });
        this.addLog(`${e.name} burns — all soldiers take ${e.turnDamageAll} damage!`);
        this.checkPartyDowned();
        if (this.party.every(u => u.downed)) {
          this.phase = PHASE.DEFEAT;
          this.addLog('The cohort burns...');
          this.update();
          return;
        }
      }
      // Healing Totem: heals the boss each turn
      if (!e.dead && e.healBoss) {
        const boss = this.enemies.find(b => b.id === e.healBossId && !b.dead);
        if (boss) {
          const healAmt = Math.min(e.healBoss, boss.maxHp - boss.hp);
          if (healAmt > 0) {
            boss.hp += healAmt;
            this.addLog(`${e.name} heals ${boss.name} for ${healAmt} HP.`);
          }
        }
      }
    });

    // Morale decay moved to endPlayerTurn

    // Special: Wicker Ash — enemies take damage at start of turn (scales with level)
    const wickerAshCarrier = this.party.find(u => !u.downed && this.unitHasItem(u, 'wicker_ash'));
    if (wickerAshCarrier) {
      const waLv = this.getItemLevel(wickerAshCarrier, 'wicker_ash');
      const waDmg = waLv;
      this.enemies.forEach(e => {
        if (!e.dead) {
          e.hp = Math.max(0, e.hp - waDmg);
        }
      });
      this.addLog(`Wicker ash burns — all enemies take ${waDmg} damage.`);
      this.checkEnemyDeaths();
    }

    // Vestalis passive: Sacred Flame — heal lowest HP ally for 2 at start of turn
    const vestalis = this.party.find(u => u.classId === 'vestalis' && !u.downed);
    if (vestalis) {
      const lowestHp = this.party.filter(u => !u.downed && u.hp < u.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (lowestHp) {
        const heal = Math.min(2, lowestHp.maxHp - lowestHp.hp);
        lowestHp.hp += heal;
        if (heal > 0) {
          this.addLog(`Sacred Flame heals ${lowestHp.name} for ${heal} HP.`);
          if (this.onVisual) this.onVisual('unitHeal', { unitIndex: lowestHp.index, amount: heal });
        }
      }
    }

    // Herb Pouch: heal wielder each turn (scales with level)
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'herb_pouch') && u.hp < u.maxHp) {
        const hpLv = this.getItemLevel(u, 'herb_pouch');
        const hpHeal = 1 * hpLv;
        u.hp = Math.min(u.maxHp, u.hp + hpHeal);
        this.addLog(`${u.name}'s Herb Pouch heals ${hpHeal} HP.`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: u.index, amount: hpHeal });
      }
    });

    // Crown of Ariovistus: gain block equal to number of living enemies
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'crown_of_ariovistus')) {
        const livingEnemies = this.enemies.filter(e => !e.dead).length;
        if (livingEnemies > 0) {
          u.block = (u.block || 0) + livingEnemies;
          this.addLog(`Crown of Ariovistus grants ${u.name} ${livingEnemies} Block.`);
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: livingEnemies });
        }
      }
    });

    // Vestments of Flora: heal the most wounded ally for 2 HP each turn
    this.party.forEach(u => {
      if (!u.downed && this.unitHasItem(u, 'vestments_of_flora')) {
        const wounded = this.party.filter(a => !a.downed && a.hp < a.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        if (wounded.length > 0) {
          const target = wounded[0];
          const healAmt = Math.min(2, target.maxHp - target.hp);
          if (healAmt > 0) {
            target.hp += healAmt;
            this.addLog(`Vestments of Flora heals ${target.name} for ${healAmt} HP.`);
            if (this.onVisual) this.onVisual('unitHeal', { unitIndex: target.index, amount: healAmt });
          }
        }
      }
    });

    // Eagle of the Lost Ninth: on turn 7, deal 20 damage to all enemies
    if (this.turn === 7 && !this._eagleUsed && this.partyHasItem('eagle_lost_ninth')) {
      this._eagleUsed = true;
      this.enemies.forEach(e => {
        if (!e.dead) e.hp = Math.max(0, e.hp - 20);
      });
      this.addLog('The Eagle of the Lost Ninth awakens — 20 damage to all enemies!');
      this.checkEnemyDeaths();
      if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
        this.triggerVictory();
        return;
      }
    }

    this.party.forEach(u => {
      if (this.turn > 1) {
        // Varus's Shield: retain up to 5 block between turns
        if (this.unitHasItem(u, 'varus_shield')) {
          u.block = Math.min(u.block || 0, 5);
        // Destrier's Barding: retain up to 2 block between turns
        } else if (this.unitHasItem(u, 'destriers_barding')) {
          u.block = Math.min(u.block || 0, 2);
        } else {
          u.block = 0;
        }
        // Shield Brace: grant fresh block at the start of this turn
        if (u._blockNextTurn && u._blockNextTurn > 0) {
          u.block = (u.block || 0) + u._blockNextTurn;
          u.stats.blockGenerated += u._blockNextTurn;
          this.addLog(`${u.name}'s Shield Brace holds! (+${u._blockNextTurn} Block)`);
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: u._blockNextTurn });
          u._blockNextTurn = 0;
        }
      }
      u.taunt = false;
      u._counterStance = 0;
      u._overwatch = 0;
      // Scout's Leather: bonus damage if not hit last turn (scales with level)
      if (this.turn > 1 && this.unitHasItem(u, 'scouts_leather')) {
        const slLv = this.getItemLevel(u, 'scouts_leather');
        const slBonus = 3 + (slLv - 1);
        if (!u._wasHitThisTurn) {
          if (u._scoutsLeatherActive) u.equipDamage -= u._scoutsLeatherBonus || 3;
          u._scoutsLeatherActive = true;
          u._scoutsLeatherBonus = slBonus;
          u.equipDamage += slBonus;
          this.addLog(`${u.name}'s Scout's Leather grants +${slBonus} damage (untouched).`);
        } else if (u._scoutsLeatherActive) {
          u._scoutsLeatherActive = false;
          u.equipDamage -= u._scoutsLeatherBonus || 3;
          u._scoutsLeatherBonus = 0;
        }
      }
      // Sniper's Harness: if not hit last turn, gain +2 block and attacks ignore row
      if (this.turn > 1 && this.unitHasItem(u, 'sniper_harness')) {
        if (!u._wasHitThisTurn) {
          u.block = (u.block || 0) + 2;
          u._sniperHarnessActive = true;
          this.addLog(`${u.name}'s Sniper's Harness grants +2 Block and row-piercing attacks.`);
        } else {
          u._sniperHarnessActive = false;
        }
      }
      u._wasHitThisTurn = false;
      u._bearskinRage = 0;
      if (u._huntMarked && u._huntMarked > 0) u._huntMarked--;
      // Wilderness Instinct: delayed heal + block
      if (u._wildernessHealNext) {
        u._wildernessHealNext = false;
        const wheal = Math.min(4, u.maxHp - u.hp);
        u.hp += wheal;
        u.block = (u.block || 0) + 4;
        if (wheal > 0) this.addLog(`${u.name}'s wilderness instincts kick in — +${wheal} HP, +4 Block.`);
      }
      u._damageShield = 0;
      u._intercept = false;
      // Deep Cover: grant block on the second stunned turn
      if (u._deepCoverBlockNext) {
        u.block = (u.block || 0) + u._deepCoverBlockNext;
        u.stats.blockGenerated += u._deepCoverBlockNext;
        this.addLog(`${u.name} stays in cover — +${u._deepCoverBlockNext} Block.`);
        u._deepCoverBlockNext = 0;
      }
      // Bone Totem stun: skip this turn
      u._stunnedThisTurn = false;
      if (u._stunNextTurn) {
        u.actedThisTurn = true;
        u._stunnedThisTurn = true;
        u._stunNextTurn = false;
        this.addLog(`${u.name} is stunned and cannot act!`);
      } else {
        u.actedThisTurn = false;
      }
    });
    // Clear per-turn enemy effects
    this.enemies.forEach(e => {
      if (!e.dead) {
        e._smokeScreen = 0;
        e._snareTrap = 0;
      }
    });
    this.dicePool.adjustUsed = false;
    this.dicePool.rerollUsed = false;
    this.dicePool.itemAdjustUsed = false;
    this.dicePool.itemRerollUsed = false;
    this._ambushTargeted = null; // clear ambush spread tracking
    this._ambushStunCount = undefined; // clear ambush stun limit
    this._ambushDamageHalved = false; // clear ambush half damage

    // Tick down skill cooldowns
    this.party.forEach(u => {
      u.skills.forEach(s => {
        if (s.cooldownLeft && s.cooldownLeft > 0) s.cooldownLeft--;
      });
    });
    this.targetMode = null;
    this.addLog(`\u2014 Turn ${this.turn} \u2014`);

    // Roll dice — base 4 + extra from equipment
    let extraDice = this.getExtraDiceCount();
    // Pact of Wolves: +1 die every 3rd turn
    if (this.partyHasItem('pact_of_wolves') && this.turn > 0 && this.turn % 3 === 0) {
      extraDice++;
      this.addLog('The Pact of Wolves grants an extra die!');
    }
    // Moonstone Ring: +1 die if morale > 70
    if (this.partyHasItem('moonstone_ring') && this.morale > 70) {
      extraDice++;
      this.addLog('Moonstone Ring shines — morale grants an extra die!');
    }
    // Boon: Varus's Lesson — +1 die on first turn
    if (this._boonBonusDice && this.turn === 1) {
      extraDice += this._boonBonusDice;
      this.addLog("Varus's Lesson grants a bonus die!");
      this._boonBonusDice = 0;
    }
    // Boon: First Blood — remove damage buff after 2 turns
    if (this._firstBloodTurn !== undefined) {
      this._firstBloodTurn--;
      if (this._firstBloodTurn <= 0) {
        this.party.forEach(u => {
          u.buffs = u.buffs.filter(b => b.attacksLeft !== 99);
        });
        this._firstBloodTurn = undefined;
      }
    }
    // Bonus dice from abilities (Tactical Preparation, etc.)
    if (this._bonusDiceNext) {
      extraDice += this._bonusDiceNext;
      this.addLog(`Tactical preparation grants ${this._bonusDiceNext} extra dice!`);
      this._bonusDiceNext = 0;
    }
    // Heartwood Charm: +3 dice next turn after first damage taken
    if (this._heartwoodBonusDice) {
      extraDice += this._heartwoodBonusDice;
      this.addLog(`Heartwood Charm grants ${this._heartwoodBonusDice} extra dice!`);
      this._heartwoodBonusDice = 0;
    }
    // Event bonus dice (from event choices)
    if (this._eventBonusDice) {
      extraDice += this._eventBonusDice;
      this.addLog(`Event bonus: +${this._eventBonusDice} extra dice this combat!`);
      this._eventBonusDice = 0;
    }
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

    // Silent Huntsman: destroy an odd die every 2 turns (after player rolls)
    const huntsman = this.enemies.find(e => e.id === 'silent_huntsman' && !e.dead);
    if (huntsman && this.turn % 2 === 0) {
      const oddDice = this.dicePool.dice.filter(d => !d.used && d.value % 2 === 1);
      if (oddDice.length > 0) {
        const victim = oddDice[Math.floor(Math.random() * oddDice.length)];
        this.dicePool.useDie(victim.id);
        this.addLog(`The Huntsman's arrow shatters a die! (${victim.value} destroyed)`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    }

    // Runecarver: Rune of Binding — lower all dice by 1 (min 1)
    const runecarvers = this.enemies.filter(e => !e.dead && e._runeBindingPending);
    runecarvers.forEach(rc => {
      rc._runeBindingPending = false;
      let affected = 0;
      this.dicePool.dice.forEach(d => {
        if (!d.used && d.value > 1) { d.value--; affected++; }
      });
      if (affected > 0) {
        this.addLog(`Rune of Binding weakens ${affected} dice! (-1 each)`);
      }
    });

    // Hex/Binding — destroy a random die (set by previous turn's action)
    const hexEnemies = this.enemies.filter(e => !e.dead && e._hexPending);
    hexEnemies.forEach(hexer => {
      hexer._hexPending = false;
      const available = this.dicePool.dice.filter(d => !d.used);
      if (available.length > 0) {
        const victim = available[Math.floor(Math.random() * available.length)];
        this.dicePool.useDie(victim.id);
        this.addLog(`${hexer.name}'s curse crumbles a die! (${victim.value} destroyed)`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    });

    // Corpse of Varus: every 2 turns, corrupt one die to become a 1
    const corpseVarus = this.enemies.find(e => e.id === 'corpse_of_varus' && !e.dead);
    if (corpseVarus && this.turn % 2 === 0) {
      const available = this.dicePool.dice.filter(d => !d.used && d.value > 1);
      if (available.length > 0) {
        const victim = available[Math.floor(Math.random() * available.length)];
        const oldVal = victim.value;
        victim.value = 1;
        this.addLog(`Varus's corrupted command forces a die from ${oldVal} to 1!`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    }

    // Corpse of Varus: corrupts one die to a 1 every 2 turns
    const varus = this.enemies.find(e => e.id === 'corpse_of_varus' && !e.dead);
    if (varus && this.turn % 2 === 0) {
      const available = this.dicePool.dice.filter(d => !d.used && d.value > 1);
      if (available.length > 0) {
        const victim = available[Math.floor(Math.random() * available.length)];
        victim.value = 1;
        this.addLog(`Varus's corrupted command forces a die to 1!`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    }

    // Blood Stag: regenerates 3 HP per turn while in back row
    const bloodStag = this.enemies.find(e => e.id === 'blood_stag' && !e.dead && e.row === 'back');
    if (bloodStag && bloodStag.hp < bloodStag.maxHp) {
      const regen = Math.min(3, bloodStag.maxHp - bloodStag.hp);
      bloodStag.hp += regen;
      this.addLog(`${bloodStag.name} regenerates ${regen} HP in the treeline.`);
    }

    // Spirits of Arminius & Varus: resurrection timer
    for (const spirit of this.enemies) {
      if (!spirit.dead && spirit._resurrectTimer !== undefined && spirit._resurrectTimer > 0) {
        spirit._resurrectTimer--;
        if (spirit._resurrectTimer <= 0 && spirit._resurrectTarget) {
          const fallen = spirit._resurrectTarget;
          fallen.dead = false;
          fallen.hp = Math.floor(fallen.maxHp * 0.3);
          fallen.poison = 0;
          fallen.block = 0;
          this.addLog(`${spirit.name} channels — ${fallen.name} rises again at ${fallen.hp} HP!`);
          if (this.onVisual) this.onVisual('screenShake', {});
          spirit._resurrectTarget = null;
          spirit._resurrectTimer = undefined;
        } else if (spirit._resurrectTimer > 0) {
          this.addLog(`${spirit.name} channels resurrection... ${spirit._resurrectTimer} turn(s) remain.`);
        }
      }
    }

    // Healing Totem: each living totem roots (disables) one die
    const livingTotems = this.enemies.filter(e => !e.dead && e.id === 'healing_totem');
    if (livingTotems.length > 0) {
      let rootCount = 0;
      const available = this.dicePool.dice.filter(d => !d.used);
      for (let t = 0; t < livingTotems.length && rootCount < available.length; t++) {
        const victim = available[rootCount];
        if (victim) {
          this.dicePool.useDie(victim.id);
          rootCount++;
        }
      }
      if (rootCount > 0) {
        this.addLog(`Healing Totems entangle ${rootCount} dice in roots!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: 0, text: `${rootCount} dice rooted!`, color: '#4a7a28' });
      }
    }

    // Serpent Shaman: passive dance — swap with a snake and heal 6 each turn
    const shaman = this.enemies.find(e => e.id === 'serpent_shaman' && !e.dead);
    if (shaman) {
      const snakes = this.enemies.filter(e => !e.dead && e !== shaman && (e.id === 'fen_viper' || e.id === 'serpent_shade'));
      if (snakes.length > 0) {
        // Prefer a snake in the opposite row; if all in same row, swap forces row change
        const oppositeRow = shaman.row === 'front' ? 'back' : 'front';
        let swapTarget = snakes.find(s => s.row === oppositeRow);
        if (swapTarget) {
          // Normal swap — they trade rows
          const oldRow = shaman.row;
          shaman.row = swapTarget.row;
          swapTarget.row = oldRow;
        } else {
          // All in same row — shaman moves to opposite, snake stays
          shaman.row = oppositeRow;
          swapTarget = snakes[Math.floor(Math.random() * snakes.length)];
        }
        const heal = Math.min(6, shaman.maxHp - shaman.hp);
        if (heal > 0) shaman.hp += heal;
        this.addLog(`${shaman.name} dances — swaps with ${swapTarget.name} and heals ${heal} HP!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: shaman.index, text: 'Dance!', color: '#8a4' });
      } else {
        // No snakes — just swap row and heal (reduced)
        shaman.row = shaman.row === 'front' ? 'back' : 'front';
        const heal = Math.min(4, shaman.maxHp - shaman.hp);
        if (heal > 0) shaman.hp += heal;
        this.addLog(`${shaman.name} dances to the ${shaman.row} row! (+${heal} HP)`);
      }
    }

    // Fog Weaver: decrease the value of 1-2 random dice each turn
    const fogWeaver = this.enemies.find(e => e.id === 'fog_weaver' && !e.dead);
    if (fogWeaver) {
      const fogCount = 1 + (this.turn >= 4 ? 1 : 0);
      const available = this.dicePool.dice.filter(d => !d.used && d.value > 1);
      const shuffled = available.sort(() => Math.random() - 0.5).slice(0, fogCount);
      shuffled.forEach(d => {
        const reduction = 1 + Math.floor(Math.random() * 2); // reduce by 1-2
        const oldVal = d.value;
        d.value = Math.max(1, d.value - reduction);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: d.id, type: 'damage' }] });
      });
      if (shuffled.length > 0) {
        this.addLog(`The fog warps ${shuffled.length} dice — values decrease!`);
      }
    }

    // Leech Mound / Lesser: venom 1 die — using it poisons the caster for 2
    const leechBoss = this.enemies.find(e => (e.id === 'leech_mound' || e.id === 'lesser_leech_mound') && !e.dead);
    if (leechBoss) {
      const available = this.dicePool.dice.filter(d => !d.used && !d._venomed);
      if (available.length > 0) {
        const victim = available[Math.floor(Math.random() * available.length)];
        victim._venomed = true;
        this.addLog(`The ${leechBoss.name} oozes venom onto a die! Using it will poison the caster.`);
        if (this.onVisual) this.onVisual('dicePassive', { triggers: [{ dieId: victim.id, type: 'damage' }] });
      }
    }

    // Germanic Warlord: Iron Discipline — every 3 turns, grant all enemies 7 Block
    const warlord = this.enemies.find(e => e.id === 'arminius_champion' && !e.dead);
    if (warlord && this.turn > 0 && this.turn % 3 === 0) {
      this.enemies.forEach(e => {
        if (!e.dead) e.block = (e.block || 0) + 7;
      });
      this.addLog(`${warlord.name} bellows — Iron Discipline! All enemies gain 7 Block!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: warlord.index, text: 'Iron Discipline!', color: 'var(--blue-bright)' });
    }

    // Blood Stag: announce charge when in back row (will deal double next turn vs no-block)
    const stag = this.enemies.find(e => e.id === 'blood_stag' && !e.dead);
    if (stag) {
      if (stag._chargingNextTurn) {
        stag._chargingNextTurn = false;
        stag._chargeReady = true;
      } else if (stag.row === 'back' && !stag._chargeReady && this.turn > 1) {
        stag._chargingNextTurn = true;
        this.addLog(`${stag.name} lowers its antlers — CHARGING next turn!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: stag.index, text: 'CHARGING!', color: 'var(--red-bright)' });
      }
    }

    // Story bosses: spawn spectral images of previously killed bosses
    // Spectrals killed in any story fight are permanently gone for the rest of the run
    const storyBossIds = ['corpse_of_arminius', 'corpse_of_varus', 'spirit_of_arminius', 'spirit_of_varus'];
    const hasStoryBoss = this.enemies.some(e => storyBossIds.includes(e.id) && !e.dead);
    const isSpirits = this.enemies.some(e => (e.id === 'spirit_of_arminius' || e.id === 'spirit_of_varus') && !e.dead);
    const spectralTurnThreshold = isSpirits ? 2 : 3;
    if (hasStoryBoss && this.turn >= spectralTurnThreshold && this.runKilledBosses && this.runKilledBosses.length > 0) {
      // Run-wide defeated spectrals persist across all story boss fights
      if (!this._runSpectralDefeated) this._runSpectralDefeated = new Set();
      if (!this._spectralQueue) {
        const excludeIds = ['corpse_of_arminius', 'corpse_of_varus', 'spirit_of_arminius', 'spirit_of_varus'];
        this._spectralQueue = this.runKilledBosses.filter(id => !excludeIds.includes(id) && !this._runSpectralDefeated.has(id));
        this._spectralSpawnedThisFight = 0;
      }
      // Corpse fights: max 1 spectral total. Spirits fight: up to 2 at a time.
      const maxSpectrals = isSpirits ? 2 : 1;
      const maxThisFight = isSpirits ? 99 : 1;
      const livingSpectrals = this.enemies.filter(e => !e.dead && e._isSpectral).length;
      const remaining = this._spectralQueue.filter(id => !this._runSpectralDefeated.has(id));
      if (livingSpectrals < maxSpectrals && remaining.length > 0 && this._spectralSpawnedThisFight < maxThisFight) {
        const nextId = remaining[0];
        const data = ENEMY_DATA[nextId];
        if (data && this.enemies.filter(e => !e.dead).length < 6) {
          this._spectralSpawnedThisFight++;
          const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
          const spectralHp = Math.round(data.maxHp * this.getHpScale(diffBonus) / 3);
          const spectralActions = data.actions.map(a => ({
            ...a,
            damage: a.damage > 0 ? Math.max(1, Math.round(a.damage * (1 + diffBonus * 0.35) / 3)) : 0,
          }));
          const spectral = {
            index: this.enemies.length,
            ...data,
            name: `Spectral ${data.name.replace(/^The /, '')}`,
            maxHp: spectralHp,
            hp: spectralHp,
            actions: spectralActions,
            dead: false,
            poison: 0,
            block: 0,
            justSpawned: true,
            _isSpectral: true,
            _spectralOf: nextId,
          };
          this.enemies.push(spectral);
          this.addLog(`A spectral image of ${data.name} materializes from the void!`);
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: spectral.index, text: 'Spectral!', color: '#7a4aaa' });
          setTimeout(() => { spectral.justSpawned = false; this.update(); }, 500);
        }
      }
    }

    // Dice passives trigger on rolled values
    this.processDicePassives();

    // Roll enemy intents on first turn (subsequent turns get them at end of enemy turn)
    if (this.turn === 1 || !this.enemies.some(e => e._intent)) {
      this.rollEnemyIntents();
    }

    this.update();
  }

  processDicePassives() {
    const hasMedicus = this.party.some(u => u.classId === 'medicus' && !u.downed);
    const hasSagittarius = this.party.some(u => u.classId === 'sagittarius' && !u.downed);
    const legionary = this.party.find(u => u.classId === 'legionary' && !u.downed);

    const triggeredDice = []; // { dieId, type } for UI flash

    for (const die of this.dicePool.dice) {
      // Medicus: heal random damaged ally on each 1 (scales with difficulty)
      if (die.value === 1 && hasMedicus) {
        const damaged = this.party.filter(u => !u.downed && u.hp < u.maxHp);
        if (damaged.length > 0) {
          const passiveHeal = Math.max(1, (this.difficulty || 1));
          const target = damaged[Math.floor(Math.random() * damaged.length)];
          target.hp = Math.min(target.maxHp, target.hp + passiveHeal);
          this.addLog(`Healer's Instinct: ${target.name} healed ${passiveHeal} HP.`);
          if (this.onVisual) this.onVisual('unitHeal', { unitIndex: target.index, amount: passiveHeal });
          triggeredDice.push({ dieId: die.id, type: 'heal' });
        }
      }

      // Sagittarius: damage random enemy on each 6 (scales with difficulty)
      if (die.value === 6 && hasSagittarius) {
        const alive = this.enemies.filter(e => !e.dead);
        if (alive.length > 0) {
          const passiveDmg = Math.max(1, (this.difficulty || 1));
          const target = alive[Math.floor(Math.random() * alive.length)];
          target.hp = Math.max(0, target.hp - passiveDmg);
          this.addLog(`Eagle Eye: ${target.name} takes ${passiveDmg} damage.`);
          triggeredDice.push({ dieId: die.id, type: 'damage' });
        }
      }
    }

    // Legionary: Disciplined Formation — gain +2 Block on natural pairs
    if (legionary) {
      const values = this.dicePool.dice.map(d => d.value);
      const seen = {};
      const pairValues = [];
      values.forEach((v, i) => {
        if (seen[v] !== undefined && !pairValues.includes(v)) {
          pairValues.push(v);
          triggeredDice.push({ dieId: this.dicePool.dice[seen[v]].id, type: 'block' });
          triggeredDice.push({ dieId: this.dicePool.dice[i].id, type: 'block' });
        }
        if (seen[v] === undefined) seen[v] = i;
      });
      if (pairValues.length > 0) {
        const blockGain = pairValues.length * 2;
        legionary.block = (legionary.block || 0) + blockGain;
        this.addLog(`Disciplined Formation: ${legionary.name} gains ${blockGain} Block (${pairValues.length} pair${pairValues.length > 1 ? 's' : ''}).`);
        if (this.onVisual) this.onVisual('unitBlock', { unitIndex: legionary.index, amount: blockGain });
      }
    }

    // Notify UI about triggered dice for flashing
    if (triggeredDice.length > 0 && this.onVisual) {
      this.onVisual('dicePassive', { triggers: triggeredDice });
    }

    // Check if any enemy died from Sagittarius passive
    this.checkEnemyDeaths();
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead)) {
      this.triggerVictory();
    }
  }

  // --- Centurion passive / Seer's Knucklebone ---
  canAdjustDie() {
    if (!this.dicePool.adjustUsed && this.morale < 70 && this.party.some(u => u.classId === 'centurion' && !u.downed)) return true;
    if (!this.dicePool.itemAdjustUsed && this.partyHasItem('seers_knucklebone')) return true;
    return false;
  }

  adjustDie(dieId, direction) {
    if (!this.canAdjustDie()) return false;
    const die = this.dicePool.dice.find(d => d.id === dieId);
    if (!die || die.used) return false;
    const newVal = die.value + direction;
    if (newVal < 1 || newVal > 6) return false;
    const oldVal = die.value;
    die.value = newVal;

    // Use class passive first, then item
    const hasCenturion = !this.dicePool.adjustUsed && this.morale < 70 && this.party.some(u => u.classId === 'centurion' && !u.downed);
    if (hasCenturion) {
      this.dicePool.adjustUsed = true;
      this.addLog(`Centurion adjusts die: ${oldVal} \u2192 ${die.value}`);
    } else {
      this.dicePool.itemAdjustUsed = true;
      this.addLog(`Seer's Knucklebone adjusts die: ${oldVal} \u2192 ${die.value}`);
    }
    this.update();
    return true;
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
    // Cooldown check
    if (skill.cooldownLeft && skill.cooldownLeft > 0) return false;

    // Revive skills need a downed ally (not self)
    if (skill.effects && skill.effects.revive) {
      const self = this.party[unitIndex];
      if (!this.party.some(u => u.downed && u !== self)) return false;
    }

    // Morale cost skills need enough morale
    if (skill.effects && skill.effects.moraleCost) {
      if (this.morale < skill.effects.moraleCost) return false;
    }

    // Disable pure heal skills when nobody is damaged
    const eff = skill.effects || {};
    const isHealOnly = (eff.heal || eff.healAll) &&
      !eff.damage && !eff.damageAll && !eff.poison && !eff.poisonAll &&
      !eff.block && !eff.blockAll && !eff.morale && !eff.buffAllies &&
      !eff.cleanse && !eff.taunt && !eff.markTarget;
    if (isHealOnly) {
      const anyDamaged = this.party.some(u => !u.downed && u.hp < u.maxHp);
      if (!anyDamaged) return false;
    }

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
      case 'even':
        return available.some(d => d.value % 2 === 0);
      case 'odd':
        return available.some(d => d.value % 2 === 1);
      case 'pair': {
        const vals = {};
        for (const d of available) { vals[d.value] = (vals[d.value] || 0) + 1; }
        return Object.values(vals).some(c => c >= 2);
      }
      case 'pairEven': {
        const evens = {};
        for (const d of available) { if (d.value % 2 === 0) evens[d.value] = (evens[d.value] || 0) + 1; }
        return Object.values(evens).some(c => c >= 2);
      }
      case 'pairOdd': {
        const odds = {};
        for (const d of available) { if (d.value % 2 === 1) odds[d.value] = (odds[d.value] || 0) + 1; }
        return Object.values(odds).some(c => c >= 2);
      }
      case 'oddEven': {
        const hasOdd = available.some(d => d.value % 2 === 1);
        const hasEven = available.some(d => d.value % 2 === 0);
        return hasOdd && hasEven;
      }
      case 'consecutive': {
        const vals = [...new Set(available.map(d => d.value))].sort((a, b) => a - b);
        for (let i = 0; i < vals.length - 1; i++) {
          if (vals[i + 1] - vals[i] === 1) return true;
        }
        return false;
      }
      case 'pairExact6': {
        const sixes = available.filter(d => d.value === 6);
        return sixes.length >= 2;
      }
      default:
        return false;
    }
  }

  // Auto-pick the best dice for a skill cost
  autoPick(skill) {
    const available = this.dicePool.getAvailable();
    const cost = skill.cost;

    switch (cost.type) {
      case 'any': {
        if (available.length === 0) return [];
        // Pick highest die if skill scales with die value, lowest otherwise
        const hasDieScale = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        if (hasDieScale) {
          return [available.reduce((max, d) => d.value > max.value ? d : max, available[0]).id];
        }
        return [available.reduce((min, d) => d.value < min.value ? d : min, available[0]).id];
      }
      case 'threshold': {
        const hasDieScaleT = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        const validT = available.filter(d => d.value >= cost.min).sort((a, b) => hasDieScaleT ? b.value - a.value : a.value - b.value);
        return validT.length > 0 ? [validT[0].id] : [];
      }
      case 'range': {
        const hasDieScaleR = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        const validR = available.filter(d => d.value >= cost.min && d.value <= cost.max).sort((a, b) => hasDieScaleR ? b.value - a.value : a.value - b.value);
        return validR.length > 0 ? [validR[0].id] : [];
      }
      case 'exact':
        const exact = available.find(d => d.value === cost.val);
        return exact ? [exact.id] : [];
      case 'combined': {
        const numDice = cost.dice || 2;
        const hasDieScaleC = skill.effects && (skill.effects.dieScaleDamage || skill.effects.dieScaleBlock || skill.effects.dieScaleHeal);
        // Find the best N-dice combination that meets the minimum
        let bestCombo = null;
        let bestSum = hasDieScaleC ? -Infinity : Infinity;
        const findCombo = (start, picked) => {
          if (picked.length === numDice) {
            const sum = picked.reduce((s, d) => s + d.value, 0);
            if (sum >= cost.min && (hasDieScaleC ? sum > bestSum : sum < bestSum)) {
              bestSum = sum;
              bestCombo = picked.map(d => d.id);
            }
            return;
          }
          for (let i = start; i < available.length; i++) {
            findCombo(i + 1, [...picked, available[i]]);
          }
        };
        findCombo(0, []);
        return bestCombo || [];
      }
      case 'combinedExact': {
        const numDiceE = cost.dice || 2;
        let exactCombo = null;
        const findExact = (start, picked) => {
          if (exactCombo) return;
          if (picked.length === numDiceE) {
            if (picked.reduce((s, d) => s + d.value, 0) === cost.val) {
              exactCombo = picked.map(d => d.id);
            }
            return;
          }
          for (let i = start; i < available.length; i++) {
            findExact(i + 1, [...picked, available[i]]);
          }
        };
        findExact(0, []);
        return exactCombo || [];
      }
      case 'even': {
        // Pick highest even die (more block/damage from die value scaling)
        const evens = available.filter(d => d.value % 2 === 0).sort((a, b) => b.value - a.value);
        return evens.length > 0 ? [evens[0].id] : [];
      }
      case 'odd': {
        // Pick highest odd die
        const odds = available.filter(d => d.value % 2 === 1).sort((a, b) => b.value - a.value);
        return odds.length > 0 ? [odds[0].id] : [];
      }
      case 'pair': {
        // Find lowest value pair
        const sorted = [...available].sort((a, b) => a.value - b.value);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].value === sorted[i + 1].value) {
            return [sorted[i].id, sorted[i + 1].id];
          }
        }
        return [];
      }
      case 'pairEven': {
        // Find highest even pair
        const sortedE = [...available].filter(d => d.value % 2 === 0).sort((a, b) => b.value - a.value);
        for (let i = 0; i < sortedE.length - 1; i++) {
          if (sortedE[i].value === sortedE[i + 1].value) {
            return [sortedE[i].id, sortedE[i + 1].id];
          }
        }
        return [];
      }
      case 'pairOdd': {
        // Find highest odd pair
        const sortedO = [...available].filter(d => d.value % 2 === 1).sort((a, b) => b.value - a.value);
        for (let i = 0; i < sortedO.length - 1; i++) {
          if (sortedO[i].value === sortedO[i + 1].value) {
            return [sortedO[i].id, sortedO[i + 1].id];
          }
        }
        return [];
      }
      case 'oddEven': {
        // Pick lowest odd + lowest even
        const oddD = available.filter(d => d.value % 2 === 1).sort((a, b) => a.value - b.value);
        const evenD = available.filter(d => d.value % 2 === 0).sort((a, b) => a.value - b.value);
        return (oddD.length > 0 && evenD.length > 0) ? [oddD[0].id, evenD[0].id] : [];
      }
      case 'consecutive': {
        const sortedC = [...available].sort((a, b) => a.value - b.value);
        for (let i = 0; i < sortedC.length - 1; i++) {
          if (sortedC[i + 1].value - sortedC[i].value === 1) {
            return [sortedC[i].id, sortedC[i + 1].id];
          }
        }
        return [];
      }
      case 'pairExact6': {
        const sixes = available.filter(d => d.value === 6);
        return sixes.length >= 2 ? [sixes[0].id, sixes[1].id] : [];
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
      const validTargets = this.getValidEnemyTargets(skill, unit);
      if (validTargets.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [validTargets[0]]);
      } else if (validTargets.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'enemy' };
        this.update();
      }
    } else if (skill.target === TARGET.RANDOM_ENEMY) {
      const validTargets = this.getValidEnemyTargets(skill, unit);
      if (validTargets.length > 0) {
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        this.executeSkill(unitIndex, skillId, diceIds, [target]);
      }
    } else if (skill.target === TARGET.DUAL_ENEMY) {
      const validTargets = this.getValidEnemyTargets(skill, unit);
      if (validTargets.length === 1) {
        // Only one target — hit it twice
        this.executeSkill(unitIndex, skillId, diceIds, [validTargets[0], validTargets[0]]);
      } else if (validTargets.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: 'dual_enemy', selectedTargets: [] };
        this.update();
      }
    } else if (skill.target === TARGET.SINGLE_ALLY) {
      const isRevive = skill.effects && skill.effects.revive;
      const unit = this.party[unitIndex];
      let aliveAllies = isRevive ? this.party.filter(u => u.downed && u !== unit) : this.party.filter(u => !u.downed);
      // targetOthers: exclude self from valid targets
      if (skill.targetOthers) aliveAllies = aliveAllies.filter(u => u !== unit);
      if (aliveAllies.length === 1) {
        this.executeSkill(unitIndex, skillId, diceIds, [aliveAllies[0]]);
      } else if (aliveAllies.length > 1) {
        this.targetMode = { unitIndex, skillId, diceIds, skill, targetType: isRevive ? 'ally_downed' : 'ally' };
        this.update();
      }
    } else {
      this.executeSkill(unitIndex, skillId, diceIds, []);
    }
  }

  selectTarget(target) {
    if (!this.targetMode) return;
    const { unitIndex, skillId, diceIds } = this.targetMode;

    // Dual enemy targeting: collect two targets
    if (this.targetMode.targetType === 'dual_enemy') {
      this.targetMode.selectedTargets.push(target);
      if (this.targetMode.selectedTargets.length >= 2) {
        const targets = this.targetMode.selectedTargets;
        this.targetMode = null;
        this.executeSkill(unitIndex, skillId, diceIds, targets);
      } else {
        this.update();
      }
      return;
    }

    this.executeSkill(unitIndex, skillId, diceIds, [target]);
    this.targetMode = null;
  }

  cancelTarget() {
    this.targetMode = null;
    this.update();
  }

  getValidEnemyTargets(skill, unit) {
    const alive = this.enemies.filter(e => !e.dead);
    if (skill.ignoreRow) return alive;
    // Huntsman's Arrow / Sniper's Harness: attacks can target any row
    if (unit && (this.unitHasItem(unit, 'huntsmans_arrow') || unit._sniperHarnessActive)) return alive;
    const front = alive.filter(e => e.row === 'front');
    if (front.length > 0) return front;
    return alive;
  }

  executeSkill(unitIndex, skillId, diceIds, targets) {
    const unit = this.party[unitIndex];
    const skill = unit.skills.find(s => s.id === skillId);

    // Cataphract passive: Iron Vanguard — first action gives all allies +3 Block
    if (unit.classId === 'cataphract' && !unit._ironVanguardUsed) {
      unit._ironVanguardUsed = true;
      this.party.forEach(u => {
        if (!u.downed) {
          u.block = (u.block || 0) + 3;
          u.stats.blockGenerated += 3;
        }
      });
      this.addLog('Iron Vanguard! All allies gain 3 Block.');
    }

    // Destrier's Barding: first action each combat grants all allies +2 Block
    if (!unit._bardigUsed && this.unitHasItem(unit, 'destriers_barding')) {
      unit._bardigUsed = true;
      this.party.forEach(u => {
        if (!u.downed) {
          u.block = (u.block || 0) + 2;
          u.stats.blockGenerated += 2;
        }
      });
      this.addLog("Destrier's Barding! All allies gain 2 Block.");
    }

    // Track skill usage for analytics and momentum
    if (!this.skillUsageStats) this.skillUsageStats = {};
    const key = `${unit.classId}:${skillId}`;
    this.skillUsageStats[key] = (this.skillUsageStats[key] || 0) + 1;
    this._totalSkillsUsed = (this._totalSkillsUsed || 0) + 1;

    const usedDice = diceIds.map(id => this.dicePool.dice.find(d => d.id === id));
    diceIds.forEach(id => this.dicePool.useDie(id));

    // Venomed dice: using a venomed die poisons the caster
    const venomedCount = usedDice.filter(d => d && d._venomed).length;
    if (venomedCount > 0) {
      const venomPoison = venomedCount * 2;
      unit.poison = (unit.poison || 0) + venomPoison;
      this.addLog(`Venomed dice! ${unit.name} takes ${venomPoison} Poison!`);
      if (this.onVisual) this.onVisual('unitPoison', { unitIndex: unit.index, amount: venomPoison });
      usedDice.forEach(d => { if (d && d._venomed) d._venomed = false; });
    }

    // Trigger cut-in portrait for the attacking unit
    if (this.onVisual) this.onVisual('skillCutIn', { classTitle: unit.title, skillName: skill.name });

    const result = skill.execute(unit, targets, usedDice);

    // Overrun: bonus damage for each other die in the roll matching the used die's value
    if (result.overrun && usedDice.length === 1 && usedDice[0]) {
      const matchVal = usedDice[0].value;
      const extraMatches = this.dicePool.dice.filter(d => d !== usedDice[0] && d.value === matchVal).length;
      if (extraMatches > 0) {
        const overrunBonus = extraMatches * (1 + (this.difficulty || 1));
        result.damage = (result.damage || 0) + overrunBonus;
        result._overrunBonus = overrunBonus;
      }
    }

    // Mars's Denarius: every 5th skill used doubles all numeric effects
    if (!this._marsSkillCount) this._marsSkillCount = 0;
    if (this.partyHasItem('mars_denarius')) {
      this._marsSkillCount++;
      if (this._marsSkillCount % 5 === 0) {
        if (result.damage) result.damage *= 2;
        if (result.heal) result.heal *= 2;
        if (result.healAll) result.healAll *= 2;
        if (result.block) result.block *= 2;
        if (result.blockAll) result.blockAll *= 2;
        if (result.poison) result.poison *= 2;
        if (result.poisonAll) result.poisonAll *= 2;
        this.addLog("Mars's Denarius — DOUBLE EFFECT!");
        if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Mars!', color: '#cc44ff' });
      }
    }

    // Set cooldown
    if (skill.cooldown) {
      skill.cooldownLeft = skill.cooldown + 1;
    }

    // Track block before for Cataphract passive
    const cataphracts = this.party.filter(u => u.classId === 'cataphract' && !u.downed);
    const blockBefore = {};
    cataphracts.forEach(u => { blockBefore[u.index] = u.block || 0; });

    const logText = this.applySkillResult(unit, skill, result);
    this.addLog(logText);

    // Cataphract passive: Iron Vanguard — block gain → +1 damage next attack
    cataphracts.forEach(u => {
      const gained = (u.block || 0) - (blockBefore[u.index] || 0);
      if (gained > 0) {
        if (!u.buffs) u.buffs = [];
        u.buffs.push({ damage: 1, attacksLeft: 1 });
      }
    });

    // Gladiator's Wraps: gain block after using a 2+ dice skill (scales with level)
    if (diceIds.length >= 2 && this.unitHasItem(unit, 'gladiators_wraps')) {
      const gwLv = this.getItemLevel(unit, 'gladiators_wraps');
      const gwBlock = 3 + (gwLv - 1);
      unit.block = (unit.block || 0) + gwBlock;
      this.addLog(`Gladiator's Wraps grant ${unit.name} ${gwBlock} Block.`);
      if (this.onVisual) this.onVisual('unitBlock', { unitIndex: unit.index, amount: gwBlock });
    }

    // Mark unit as acted (unless free action was granted)
    if (!result.freeAction) {
      unit.actedThisTurn = true;
    }

    if (result.noKillMorale) this._noKillMorale = true;
    this.checkEnemyDeaths();
    this._noKillMorale = false;
    this.processBossPhases();
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
    if (this.morale >= 85) moraleMod = 2;
    else if (this.morale >= 70) moraleMod = 1;
    else if (this.morale <= 15) moraleMod = -2;
    else if (this.morale <= 30) moraleMod = -1;
    // Consume buff damage only when actually dealing damage
    const isDealingDamage = (result.damage && result.target) || result.damageAll;
    const buffDmg = isDealingDamage ? this.consumeBuffDamage(unit) : 0;
    let bonusDmg = buffDmg + (unit.equipDamage || 0) + moraleMod;

    // Wulfswestr passive: Forest-Born — rage bonus at low morale (scales to +5 at 0)
    if (unit.classId === 'wulfswestr' && this.morale < 50 && isDealingDamage) {
      const rageBonus = Math.min(5, Math.ceil((50 - this.morale) / 10));
      bonusDmg += rageBonus;
    }

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
    // bonusHealScale: reduce equipment heal scaling for certain abilities (e.g. Wulfswestr)
    const healScale = result.bonusHealScale != null ? result.bonusHealScale : 1;
    const bonusHeal = Math.floor(((unit.equipHeal || 0) + moraleMod) * healScale);

    // Shieldbreak: strip all block BEFORE dealing damage, and weaken target if block was removed
    if (result.shieldbreak && result.target) {
      const removedBlock = result.target.block || 0;
      result.target.block = 0;
      if (removedBlock > 0) {
        parts.push(`${result.target.name}'s defenses shattered! (-${removedBlock} Block)`);
        // Weaken: target deals 40% less damage for 2 turns (reuses suppress mechanic)
        result.target._suppressed = Math.max(result.target._suppressed || 0, 2);
        parts.push(`${result.target.name} is weakened! (-40% damage for 2 turns)`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Sundered!', color: 'var(--blue-bright)' });
      }
    }

    // Wolfbite: snapshot block state before damage removes it
    if (result.wolfbite && result.target) {
      result._targetHadBlock = (result.target.block || 0) > 0;
    }

    if (result.damage && result.target && result.target.hp !== undefined) {
      // Morale Scaling: damage scales from 0.5x at 0 morale to 2.5x at 100 morale
      let scaledDamage = result.damage;
      if (result.moraleScaling) {
        // Linear scale: morale 0 = 0.5x, 50 = 1.5x, 100 = 2.5x
        const moraleNorm = this.morale / 100; // 0 to 1
        const scale = 0.5 + moraleNorm * 2.0; // 0.5 to 2.5
        scaledDamage = Math.round(result.damage * scale);
        if (scale > 1.05) parts.push(`Morale fuels the charge! (x${scale.toFixed(1)})`);
      }
      // Bonus damage scaling: only scales own equipment damage, buff damage always full
      const dmgScale = result.bonusDmgScale || (result.halfBonusDmg ? 0.5 : 1);
      const ownBonusDmg = (unit.equipDamage || 0) + moraleMod + chargeBonus;
      let effectiveBonusDmg = dmgScale !== 1 ? Math.floor(ownBonusDmg * dmgScale) + buffDmg : bonusDmg;
      // Die-scale: equipment bonus scales with die value (die/3). High rolls amplify gear, low rolls diminish it.
      if (result._dieScaleFactor != null) {
        effectiveBonusDmg = Math.floor(effectiveBonusDmg * result._dieScaleFactor);
      }
      // Overrun: log bonus from matching dice
      if (result._overrunBonus) {
        parts.push(`Overrun! (+${result._overrunBonus})`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Overrun!', color: 'var(--gold)' });
      }
      // Split damage: calculate total first, then halve for each target
      let total = (result.splitDamage ? Math.floor((scaledDamage + effectiveBonusDmg) / 2) : scaledDamage + effectiveBonusDmg);
      // Mark Target: +20% damage to marked enemies
      if (result.target._marked && result.target._marked > 0) {
        total = Math.round(total * 1.2);
        parts.push('Marked! (+20%)');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Marked!', color: 'var(--red-bright)' });
      }
      // Condemn: +30% damage from all sources
      if (result.target._condemned && result.target._condemned > 0) {
        total = Math.round(total * 1.3);
        parts.push('Condemned! (+30%)');
      }
      // Blade of Ariovistus: bonus damage equal to enemies killed this combat
      if (this.unitHasItem(unit, 'blade_of_ariovistus') && this.killedEnemies.length > 0) {
        total += this.killedEnemies.length;
        parts.push(`Blade of Ariovistus! (+${this.killedEnemies.length})`);
      }
      // Pilum of the Lost: every 3rd attack deals double damage
      if (this.unitHasItem(unit, 'pilum_of_the_lost')) {
        if (!unit._pilumCount) unit._pilumCount = 0;
        unit._pilumCount++;
        if (unit._pilumCount >= 3) {
          unit._pilumCount = 0;
          total *= 2;
          parts.push('Pilum of the Lost strikes true! (x2)');
          if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'x2!', color: 'var(--gold)' });
        }
      }
      // Night Owl Pendant: +bonus damage vs back-row enemies (scales with level)
      if (result.target.row === 'back' && this.unitHasItem(unit, 'night_owl_pendant')) {
        const nopLv = this.getItemLevel(unit, 'night_owl_pendant');
        const nopBonus = 2 + (nopLv - 1);
        total += nopBonus;
        parts.push(`Night Owl Pendant! (+${nopBonus} vs back row)`);
      }
      // Execute: double damage to enemies below 25% HP
      if (result.execute && result.target.hp <= result.target.maxHp * 0.25) {
        total *= 2;
        parts.push('EXECUTE!');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Execute!', color: 'var(--red-bright)' });
      }
      // Gladius Thrust: +50% damage vs targets with Block, stun, or mark
      if (result.gladiusThrust && result.target) {
        const hasDebuff = (result.target.block && result.target.block > 0) ||
          result.target._skipNextAction ||
          (result.target._marked && result.target._marked > 0) ||
          (result.target._condemned && result.target._condemned > 0);
        if (hasDebuff) {
          const bonus = Math.floor(total * 0.5);
          total += bonus;
          parts.push('Precise! (+50% vs vulnerable target)');
        }
      }
      // Aimed Shot: +3 bonus damage vs back row (scales 0.2x with equipment)
      if (result.aimedShot && result.target && result.target.row === 'back') {
        const aimedBonus = 3 + Math.floor(effectiveBonusDmg * 0.2);
        total += aimedBonus;
        parts.push(`Back row shot! (+${aimedBonus})`);
      }
      // Kill Shot: double damage to marked or poisoned targets
      if (result.killShot && ((result.target._marked && result.target._marked > 0) || (result.target.poison && result.target.poison > 0))) {
        total *= 2;
        parts.push('Kill Shot!');
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Kill Shot!', color: 'var(--red-bright)' });
      }
      // Aura damage reduction (e.g. Wicker Man protects other enemies)
      const auraReduction = this.getAuraDamageReduction(result.target);
      if (auraReduction > 0) total = Math.max(1, total - auraReduction);
      // Packleader's Bow: +3 damage vs enemies with no block
      if (this.unitHasItem(unit, 'packleaders_bow') && (!result.target.block || result.target.block <= 0)) {
        total += 3;
        parts.push("Packleader's Bow! Unshielded prey! (+3)");
      }
      // Corona Obsidionalis: above 70 morale, attacks ignore block
      const coronaPierce = this.morale > 70 && this.unitHasItem(unit, 'corona_obsidionalis');
      // Full block pierce (pierceBlock >= 99 or coronaPierce): skip block entirely, don't reduce it
      const fullPierce = coronaPierce || (result.pierceBlock && result.pierceBlock >= 99);
      // Partial pierce or normal block interaction
      if (result.target.block && result.target.block > 0 && !fullPierce) {
        let pierceAmount = result.pierceBlock || 0;
        let effectiveBlock = Math.max(0, result.target.block - pierceAmount);
        let blockDmg = total;
        if (this.unitHasItem(unit, 'warlords_blade')) blockDmg += 2;
        if (this.unitHasItem(unit, 'scorpio_crossbow')) {
          const scLv = this.getItemLevel(unit, 'scorpio_crossbow');
          blockDmg += 5 + (scLv - 1) * 2;
        }
        const absorbed = Math.min(effectiveBlock, blockDmg);
        result.target.block = Math.max(0, result.target.block - absorbed - pierceAmount);
        total -= Math.min(total, absorbed);
        if (absorbed > 0) parts.push(`${result.target.name}'s block absorbs ${absorbed}${pierceAmount > 0 ? ` (pierced ${pierceAmount})` : ''}.`);
      }
      const hpBeforeHit = result.target.hp;
      result.target.hp = Math.max(0, result.target.hp - total);
      unit.stats.damageDealt += total;
      if (total > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: total });
      const bonusStr = bonusDmg !== 0 ? ` (${result.damage}${bonusDmg >= 0 ? '+' : ''}${bonusDmg}${auraReduction > 0 ? `-${auraReduction}aura` : ''})` : (auraReduction > 0 ? ` (-${auraReduction} aura)` : '');
      parts.push(`${unit.name} uses ${skill.name} on ${result.target.name} for ${total}${bonusStr} damage.`);

      // Stormcaller Bow: attacks dealing 1/3+ of target's max HP stun the target
      if (total >= Math.ceil(result.target.maxHp / 3) && this.unitHasItem(unit, 'stormcaller_bow') && result.target.hp > 0) {
        const stunCount = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
        if (stunCount < 2) {
          result.target._skipNextAction = true;
          parts.push('Thunderbolt! Target stunned!');
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Stunned!', color: 'var(--blue-bright)' });
        }
      }

      // Overkill morale: if kill has massive overkill, restore morale
      if (result.target.hp <= 0 && hpBeforeHit > 0 && total > 0) {
        const overkill = total - hpBeforeHit;
        const overkillPct = overkill / total;
        if (overkillPct >= 0.75) {
          this.morale = Math.min(100, this.morale + 2);
          parts.push('OVERKILL! (+2 Morale)');
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'OVERKILL!', color: 'var(--gold)' });
          if (this.onVisual) this.onVisual('morale', { amount: 2 });
        } else if (overkillPct >= 0.6) {
          this.morale = Math.min(100, this.morale + 1);
          parts.push('Overkill! (+1 Morale)');
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'OVERKILL!', color: 'var(--gold)' });
          if (this.onVisual) this.onVisual('morale', { amount: 1 });
        }
      }

      // Ballistarius passive: Pinning Fire — target deals 15% less damage next action
      if (unit.classId === 'ballistarius' && total > 0 && result.target.hp > 0) {
        result.target._pinned = true;
      }

      // Shadow Network: _poisonOnAttack — apply poison on dealing damage
      if (unit._poisonOnAttack && total > 0 && result.target.hp > 0) {
        const poa = unit._poisonOnAttack;
        result.target.poison = (result.target.poison || 0) + poa.amount;
        unit.stats.poisonInflicted += poa.amount;
        parts.push(`Poisoned contact! (+${poa.amount} Poison)`);
        poa.attacks--;
        if (poa.attacks <= 0) unit._poisonOnAttack = null;
      }

      // Special: Legion Composite Bow — attacks apply Poison (scales with level)
      if (this.unitHasItem(unit, 'legion_composite_bow') && total > 0 && result.target.hp > 0) {
        const lcbLv = this.getItemLevel(unit, 'legion_composite_bow');
        const lcbPoison = 1 * lcbLv;
        result.target.poison = (result.target.poison || 0) + lcbPoison;
        unit.stats.poisonInflicted += lcbPoison;
        parts.push(`The festering arrow poisons the target. (+${lcbPoison} Poison)`);
      }

      // Special: Venomous Blade — attacks apply Poison (scales with level)
      if (this.unitHasItem(unit, 'venomous_blade') && total > 0 && result.target.hp > 0) {
        const vbLv = this.getItemLevel(unit, 'venomous_blade');
        const vbPoison = 1 * vbLv;
        result.target.poison = (result.target.poison || 0) + vbPoison;
        unit.stats.poisonInflicted += vbPoison;
        parts.push(`Venomous Blade poisons the target. (+${vbPoison} Poison)`);
      }

      // Special: Blood-Iron Gladius — attacks heal wielder (scales with level)
      if (this.unitHasItem(unit, 'blood_iron_gladius') && total > 0 && unit.hp < unit.maxHp) {
        const bigLv = this.getItemLevel(unit, 'blood_iron_gladius');
        const bigHeal = 1 * bigLv;
        unit.hp = Math.min(unit.maxHp, unit.hp + bigHeal);
        unit.stats.healingDone += bigHeal;
        parts.push(`Blood-Iron Gladius heals ${bigHeal} HP.`);
      }

      // Fury of Vulcan: attacks deal 50% splash damage to adjacent enemies
      if (this.unitHasItem(unit, 'fury_of_vulcan') && total > 0 && result.target.row) {
        const vulcanDmg = Math.max(1, Math.round(total * 0.5));
        const sameRow = this.enemies.filter(e => !e.dead && e.row === result.target.row && e !== result.target);
        sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
        adjacent.forEach(e => {
          let sDmg = vulcanDmg;
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (adjacent.length > 0) parts.push(`Fury of Vulcan burns ${adjacent.map(e => e.name).join(' and ')} for ${vulcanDmg} damage!`);
      }

      // Scorpion Greatbow: attacks pierce through to deal 3 damage to all enemies behind target
      if (this.unitHasItem(unit, 'scorpion_greatbow') && total > 0 && result.target.row === 'front') {
        const backRow = this.enemies.filter(e => !e.dead && e.row === 'back');
        backRow.forEach(e => {
          let sDmg = 3;
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (backRow.length > 0) parts.push(`Scorpion Greatbow pierces through — 3 damage to back row!`);
      }

      // Arminius's Champion: 15% damage reflection
      if (result.target.id === 'arminius_champion' && total > 0 && result.target.hp > 0) {
        const reflected = Math.max(1, Math.floor(total * 0.15));
        unit.hp = Math.max(1, unit.hp - reflected);
        unit.stats.damageTaken += reflected;
        parts.push(`Champion's armor reflects ${reflected} damage!`);
      }

      // Spirits of Arminius & Varus: damaging one heals the other 25%
      if (result.target.id === 'spirit_of_arminius' && total > 0) {
        const otherSpirit = this.enemies.find(e => e.id === 'spirit_of_varus' && !e.dead);
        if (otherSpirit) {
          const healAmt = Math.max(1, Math.floor(total * 0.25));
          otherSpirit.hp = Math.min(otherSpirit.maxHp, otherSpirit.hp + healAmt);
          parts.push(`The bond between spirits heals ${otherSpirit.name} for ${healAmt} HP!`);
        }
      }
      if (result.target.id === 'spirit_of_varus' && total > 0) {
        const otherSpirit = this.enemies.find(e => e.id === 'spirit_of_arminius' && !e.dead);
        if (otherSpirit) {
          const healAmt = Math.max(1, Math.floor(total * 0.25));
          otherSpirit.hp = Math.min(otherSpirit.maxHp, otherSpirit.hp + healAmt);
          parts.push(`The bond between spirits heals ${otherSpirit.name} for ${healAmt} HP!`);
        }
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

      // Splash back row: half damage pierces to all back-row enemies
      if (result.splashBackRow) {
        const halfDmg = Math.max(1, Math.floor((result.damage + bonusDmg) / 2));
        const backRow = this.enemies.filter(e => !e.dead && e.row === 'back');
        backRow.forEach(e => {
          let sDmg = halfDmg;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (backRow.length > 0) parts.push(`The blast pierces to the back row for ${halfDmg} damage.`);
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

      // Pierce row: bolt passes through to hit the enemy directly behind the target
      if (result.pierceRow && result.target.row) {
        const otherRow = result.target.row === 'front' ? 'back' : 'front';
        const behind = this.enemies.filter(e => !e.dead && e.row === otherRow);
        if (behind.length > 0) {
          // Pick the one closest in index (visually behind)
          const victim = behind.reduce((closest, e) =>
            Math.abs(e.index - result.target.index) < Math.abs(closest.index - result.target.index) ? e : closest, behind[0]);
          let sDmg = result.damage + bonusDmg;
          const sAura = this.getAuraDamageReduction(victim);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (victim.block && victim.block > 0) { const ab = Math.min(victim.block, sDmg); victim.block -= ab; sDmg -= ab; }
          victim.hp = Math.max(0, victim.hp - sDmg);
          unit.stats.damageDealt += sDmg;
          parts.push(`Bolt pierces through to ${victim.name}!`);
        }
      }

      // Splash adjacent: damage enemies directly beside the target in the same row
      if (result.splashAdjacent && result.target.row) {
        const sameRow = this.enemies.filter(e => !e.dead && e.row === result.target.row && e !== result.target);
        // Sort by index to find the two closest
        sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
        adjacent.forEach(e => {
          let sDmg = result.splashAdjacent;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (adjacent.length > 0) parts.push(`Tramples ${adjacent.map(e => e.name).join(' and ')} for ${result.splashAdjacent} damage.`);
      }

      // Splash adjacent percentage: deal X% of total damage to adjacent enemies (min 2)
      if (result.splashAdjacentPct && result.target.row) {
        const trampleDmg = Math.max(2, Math.round(total * result.splashAdjacentPct));
        const sameRow = this.enemies.filter(e => !e.dead && e.row === result.target.row && e !== result.target);
        sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
        adjacent.forEach(e => {
          let sDmg = trampleDmg;
          const sAura = this.getAuraDamageReduction(e);
          if (sAura > 0) sDmg = Math.max(1, sDmg - sAura);
          if (e.block && e.block > 0) { const ab = Math.min(e.block, sDmg); e.block -= ab; sDmg -= ab; }
          e.hp = Math.max(0, e.hp - sDmg);
          unit.stats.damageDealt += sDmg;
        });
        if (adjacent.length > 0) parts.push(`Tramples ${adjacent.map(e => e.name).join(' and ')} for ${trampleDmg} damage.`);
      }

      // Knockback: shove front-row enemy to back row
      if (result.knockback && result.target.row === 'front') {
        result.target.row = 'back';
        parts.push(`${result.target.name} is knocked to the back row!`);
      }

      // Dual target: apply damage to second target
      if (result.secondTarget && result.secondTarget.hp !== undefined) {
        let total2 = result.splitDamage ? Math.floor((result.damage + bonusDmg) / 2) : (scaledDamage + effectiveBonusDmg);
        const aura2 = this.getAuraDamageReduction(result.secondTarget);
        if (aura2 > 0) total2 = Math.max(1, total2 - aura2);
        if (result.secondTarget.block && result.secondTarget.block > 0) {
          const absorbed2 = Math.min(result.secondTarget.block, total2);
          result.secondTarget.block -= absorbed2;
          total2 -= absorbed2;
        }
        result.secondTarget.hp = Math.max(0, result.secondTarget.hp - total2);
        unit.stats.damageDealt += total2;
        parts.push(`${unit.name} strikes ${result.secondTarget.name} for ${total2} damage.`);
        if (this.onVisual && result.secondTarget.index !== undefined) {
          this.onVisual('enemyHit', { enemyIndex: result.secondTarget.index, damage: total2 });
        }
      }
    }
    if (result.heal && result.target) {
      let scaledBonusHeal = bonusHeal;
      if (result._dieScaleFactor != null) scaledBonusHeal = Math.floor(bonusHeal * result._dieScaleFactor);
      let totalHeal = result.heal + scaledBonusHeal;
      // Wulfswestr passive: Forest-Born — healing on self is doubled
      if (result.target.classId === 'wulfswestr' && result.target === unit) {
        totalHeal *= 2;
      }
      // Resonance: double the heal
      if (result.target._resonance) {
        totalHeal *= 2;
        result.target._resonance = false;
        parts.push('Resonance doubles the heal!');
      }
      // Healer's Oath: healing below 25% HP heals double
      if (this.unitHasItem(unit, 'healers_oath') && result.target.hp <= result.target.maxHp * 0.25) {
        totalHeal *= 2;
        parts.push("Healer's Oath doubles the heal!");
      }
      const before = result.target.hp;
      result.target.hp = Math.min(result.target.maxHp, result.target.hp + totalHeal);
      const actual = result.target.hp - before;
      unit.stats.healingDone += actual;
      const bonusStr = bonusHeal > 0 ? ` (${result.heal}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals ${result.target.name} for ${actual}${bonusStr} HP.`);
      if (actual > 0 && this.onVisual) {
        this.onVisual('unitHeal', { unitIndex: result.target.index, amount: actual });
      }
      // Bone Saw of Asclepius: healing grants target +2 damage for 1 attack
      if (this.unitHasItem(unit, 'bone_saw_of_asclepius') && actual > 0) {
        let bsAttacks = 1;
        if (this.unitHasItem(result.target, 'sigil_of_the_ninth')) bsAttacks += 1;
        result.target.buffs.push({ damage: 2, attacksLeft: bsAttacks });
        parts.push(`Bone Saw of Asclepius empowers ${result.target.name} — +2 damage (${bsAttacks === 1 ? 'next attack' : bsAttacks + ' attacks'}).`);
      }
      // Howl of Defiance: healing a unit below 25% HP also grants 4 Block
      if (this.unitHasItem(unit, 'howl_of_defiance') && actual > 0 && before <= result.target.maxHp * 0.25) {
        result.target.block = (result.target.block || 0) + 4;
        result.target.stats.blockGenerated += 4;
        parts.push(`Howl of Defiance shields ${result.target.name}! (+4 Block)`);
      }
      // Special: Marsh Fang — healing clears 3 poison from target
      if (this.unitHasItem(unit, 'marsh_fang') && result.target.poison > 0) {
        const purgeAmt = Math.min(3, result.target.poison);
        result.target.poison = Math.max(0, result.target.poison - 3);
        parts.push(`Marsh Fang purges ${purgeAmt} poison.`);
      }
      // Herbalist's Satchel: healing applies poison to random enemy (scales with level)
      if (this.unitHasItem(unit, 'herbalists_satchel') && actual > 0) {
        const hsLv = this.getItemLevel(unit, 'herbalists_satchel');
        const hsPoison = 1 * hsLv;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length > 0) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + hsPoison;
          parts.push(`Herbalist's Satchel poisons ${victim.name}. (+${hsPoison} Poison)`);
        }
      }
      // Marsh Root Brew: healing grants block to target (scales with level)
      if (this.unitHasItem(unit, 'marsh_root_brew') && actual > 0 && result.target) {
        const mrbLv = this.getItemLevel(unit, 'marsh_root_brew');
        const mrbBlock = 1 * mrbLv;
        result.target.block = (result.target.block || 0) + mrbBlock;
        parts.push(`Marsh Root Brew grants ${mrbBlock} Block.`);
      }
      // Crown of Thorns: when healed, deal damage to all enemies (scales with level)
      if (this.unitHasItem(result.target, 'crown_of_thorns') && actual > 0) {
        const cotLv = this.getItemLevel(result.target, 'crown_of_thorns');
        const cotDmg = 2 * cotLv;
        this.enemies.forEach(e => { if (!e.dead) e.hp = Math.max(0, e.hp - cotDmg); });
        parts.push(`Crown of Thorns — ${cotDmg} damage to all enemies!`);
      }
      // Bitter Remedy: when this unit is healed, poison a random enemy (scales with level)
      if (this.unitHasItem(result.target, 'bitter_remedy') && actual > 0) {
        const brLv = this.getItemLevel(result.target, 'bitter_remedy');
        const brPoison = 1 * brLv;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length > 0) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + brPoison;
          parts.push(`Bitter Remedy poisons ${victim.name}. (+${brPoison} Poison)`);
        }
      }
    }
    if (result.selfDamage) {
      const totalSelfDmg = result.selfDamage + (result.halfScaleSelfDamage ? Math.floor((unit.equipDamage || 0) / 2) : 0);
      unit.hp = Math.max(1, unit.hp - totalSelfDmg);
      unit.stats.damageTaken += totalSelfDmg;
      parts.push(`(${unit.name} takes ${totalSelfDmg} self-damage.)`);
    }
    if (result.block) {
      const blockTarget = result.blockTarget || result.target || unit;
      let scaledBonusBlock = bonusBlock;
      if (result._dieScaleFactor != null) scaledBonusBlock = Math.floor(bonusBlock * result._dieScaleFactor);
      const totalBlock = result.block + scaledBonusBlock;
      blockTarget.block = (blockTarget.block || 0) + totalBlock;
      unit.stats.blockGenerated += totalBlock;
      const bonusStr = bonusBlock > 0 ? ` (${result.block}+${bonusBlock})` : '';
      if (result.damage) {
        parts.push(`${unit.name} gains ${totalBlock} Block.`);
      } else if (!result.heal) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 ${totalBlock}${bonusStr} Block.`);
      }
      if (this.onVisual) this.onVisual('unitBlock', { unitIndex: blockTarget.index, amount: totalBlock });
      // Shield Brace: store block to also apply next turn
      if (result.shieldBrace) {
        blockTarget._blockNextTurn = (blockTarget._blockNextTurn || 0) + totalBlock;
      }
      // Shieldbearer's Grip: grant block to a random other ally (scales with level)
      if (this.unitHasItem(unit, 'shieldbearers_grip')) {
        const sgLv = this.getItemLevel(unit, 'shieldbearers_grip');
        const sgBlock = 2 + (sgLv - 1);
        const others = this.party.filter(u => !u.downed && u !== unit);
        if (others.length > 0) {
          const ally = others[Math.floor(Math.random() * others.length)];
          ally.block = (ally.block || 0) + sgBlock;
          parts.push(`Shieldbearer's Grip spreads ${sgBlock} Block to ${ally.name}.`);
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: ally.index, amount: sgBlock });
        }
      }
      // Special: Oak Splinter — block skills grant block to all other allies (scales with level)
      if (this.unitHasItem(unit, 'oak_splinter')) {
        const osLv = this.getItemLevel(unit, 'oak_splinter');
        const osBlock = 2 + (osLv - 1);
        this.party.forEach(u => {
          if (!u.downed && u !== result.target) {
            u.block = (u.block || 0) + osBlock;
            if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: osBlock });
          }
        });
        parts.push(`Oak Splinter spreads +${osBlock} Block to allies.`);
      }
    }
    if (result.taunt) {
      unit.taunt = true;
      if (parts.length > 0) parts[parts.length - 1] += ' Taunting!';
    }
    if (result.blockAll) {
      // Officer's Signet: block granted to allies increased by 1
      const signetBonus = this.unitHasItem(unit, 'officers_signet') ? 1 : 0;
      const totalBlock = result.blockAll + bonusBlock + signetBonus;
      const recipients = this.party.filter(u => !u.downed && (!result.blockOthersOnly || u !== unit));
      const count = recipients.length;
      recipients.forEach(u => {
        u.block = (u.block || 0) + totalBlock;
        if (this.onVisual) this.onVisual('unitBlock', { unitIndex: u.index, amount: totalBlock });
      });
      unit.stats.blockGenerated += totalBlock * count;
      // Shieldbearer's Grip: grant extra block to a random other ally on blockAll (scales with level)
      if (this.unitHasItem(unit, 'shieldbearers_grip')) {
        const sgLv2 = this.getItemLevel(unit, 'shieldbearers_grip');
        const sgBlock2 = 2 + (sgLv2 - 1);
        const others = this.party.filter(u => !u.downed && u !== unit);
        if (others.length > 0) {
          const ally = others[Math.floor(Math.random() * others.length)];
          ally.block = (ally.block || 0) + sgBlock2;
          if (this.onVisual) this.onVisual('unitBlock', { unitIndex: ally.index, amount: sgBlock2 });
        }
      }
      // Thusnelda's Standard: block-granting skills also restore 2 Morale
      // Battle Standard Cord / Thusnelda's Standard: block skills restore morale
      let blockMorale = 0;
      if (this.unitHasItem(unit, 'thusneldas_standard')) blockMorale += 2;
      if (this.unitHasItem(unit, 'battle_standard_cord')) blockMorale += 3;
      if (blockMorale > 0) {
        this.morale = Math.min(100, this.morale + blockMorale);
        parts.push(`+${blockMorale} Morale`);
        if (this.onVisual) this.onVisual('morale', { amount: blockMorale });
      }
      const bonusStr = bonusBlock > 0 ? ` (${result.blockAll}+${bonusBlock})` : '';
      if (!result.damage && !result.heal && !result.block) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 ${result.blockOthersOnly ? 'other allies' : 'all'} gain ${totalBlock}${bonusStr} Block.`);
      }
    }
    // Morale Heal All: heal all allies if morale is 70+
    if (result.moraleHealAll && this.morale >= 70) {
      const healAmt = result.moraleHealAll + bonusHeal;
      this.party.forEach(u => {
        if (!u.downed) {
          const actual = Math.min(healAmt, u.maxHp - u.hp);
          u.hp += actual;
          unit.stats.healingDone += actual;
          if (this.onVisual && actual > 0) this.onVisual('unitHeal', { unitIndex: u.index, amount: actual });
        }
      });
      parts.push(`High morale! All allies heal ${healAmt} HP.`);
    }
    if (result.buffAllies) {
      const attacks = result.buffAllies.attacks || 1;
      // Buff damage scales with half of caster's equipment damage
      const scaledBonusDmg = (result.buffAllies.bonusDamage || 0) + Math.floor((unit.equipDamage || 0) / 2);
      this.party.forEach(u => {
        if (!u.downed) {
          let buffAttacks = attacks;
          // Sigil of the Ninth: buff effects last 1 extra attack
          if (this.unitHasItem(u, 'sigil_of_the_ninth')) buffAttacks += 1;
          // Eagle Standard: buff skills grant 1 extra attack
          if (this.unitHasItem(unit, 'eagle_standard')) buffAttacks += 1;
          u.buffs.push({ damage: scaledBonusDmg, attacksLeft: buffAttacks });
        }
      });
      const attackStr = attacks === 1 ? 'next attack' : `next ${attacks} attacks`;
      if (!result.damage && !result.heal && !result.block && !result.blockAll) {
        parts.push(`${unit.name} uses ${skill.name} \u2014 allies gain +${scaledBonusDmg} damage (${attackStr}).`);
      }
    }
    // Buff Self: buff only the caster
    if (result.buffSelf) {
      const selfAttacks = result.buffSelf.attacks || 1;
      const selfBonusDmg = (result.buffSelf.bonusDamage || 0) + Math.floor((unit.equipDamage || 0) / 2);
      let buffAttacks = selfAttacks;
      if (this.unitHasItem(unit, 'sigil_of_the_ninth')) buffAttacks += 1;
      if (this.unitHasItem(unit, 'eagle_standard')) buffAttacks += 1;
      unit.buffs.push({ damage: selfBonusDmg, attacksLeft: buffAttacks });
      const attackStr = selfAttacks === 1 ? 'next attack' : `next ${selfAttacks} attacks`;
      parts.push(`${unit.name} gains +${selfBonusDmg} damage (${attackStr}).`);
    }
    // Poison (single target — equipment scaling, optionally amplified by bonusPoisonScale)
    if (result.poison && result.target) {
      const poisonScale = result.bonusPoisonScale || 1;
      let totalPoison = result.poison + Math.floor((unit.equipPoison || 0) * poisonScale);
      // Double/Triple Poison: multiplies applied poison if target is already poisoned
      const alreadyPoisoned = (result.target.poison || 0) > 0;
      if (result.triplePoison && alreadyPoisoned) totalPoison *= 3;
      else if (result.doublePoison && alreadyPoisoned) totalPoison *= 2;
      const multiplied = (result.triplePoison || result.doublePoison) && alreadyPoisoned;
      result.target.poison = (result.target.poison || 0) + totalPoison;
      unit.stats.poisonInflicted += totalPoison;
      if (this.onVisual) this.onVisual('enemyPoison', { enemyIndex: result.target.index, amount: totalPoison });
      const bonusStr = unit.equipPoison > 0 ? ` (${result.poison}+${unit.equipPoison})` : '';
      const doubledStr = multiplied ? (result.triplePoison ? ' TRIPLED!' : ' Doubled!') : '';
      parts.push(`Applies ${totalPoison}${bonusStr} Poison.${doubledStr}`);
    }
    // Mark Target: enemy takes +20% damage for 1 turn
    if (result.markTarget && result.target) {
      result.target._marked = 2; // ticks down each enemy turn; active while > 0
      parts.push(`${result.target.name} is marked! (+20% damage next turn)`);
    }
    // Poison splash: apply to adjacent enemies (scales slower than main target)
    if (result.poisonSplash && result.target) {
      const splashScale = result.splashPoisonScale || 0.5;
      const splashPoison = result.poisonSplash + Math.floor((unit.equipPoison || 0) * splashScale);
      // Splash to adjacent enemies (up to 2 closest in same row)
      const sameRow = this.enemies.filter(e => !e.dead && e !== result.target && e.row === result.target.row);
      sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
      const adjacent = sameRow.slice(0, 2);
      // If fewer than 2 adjacent in same row, also check other row
      if (adjacent.length < 2) {
        const otherRow = this.enemies.filter(e => !e.dead && e !== result.target && e.row !== result.target.row && !adjacent.includes(e));
        otherRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
        adjacent.push(...otherRow.slice(0, 2 - adjacent.length));
      }
      adjacent.forEach(e => {
        e.poison = (e.poison || 0) + splashPoison;
        unit.stats.poisonInflicted += splashPoison;
        if (this.onVisual) this.onVisual('enemyPoison', { enemyIndex: e.index, amount: splashPoison });
      });
      if (adjacent.length > 0) parts.push(`${splashPoison} Poison splashes to ${adjacent.map(e => e.name).join(' and ')}.`);
    }
    // Poison all enemies (includes equipment poison)
    if (result.poisonAll) {
      const totalPoison = result.poisonAll + (unit.equipPoison || 0);
      this.enemies.forEach(e => {
        if (!e.dead) {
          e.poison = (e.poison || 0) + totalPoison;
          unit.stats.poisonInflicted += totalPoison;
          if (this.onVisual) this.onVisual('enemyPoison', { enemyIndex: e.index, amount: totalPoison });
        }
      });
      parts.push(`${unit.name} uses ${skill.name} \u2014 applies ${totalPoison} Poison to all enemies.`);
    }
    // Damage all enemies (AoE)
    // Cataphract's Doom: +3 damage per remaining 6 in pool
    if (result.cataphractsDoom && result.damageAll) {
      const sixCount = this.dicePool.dice.filter(d => !d.used && d.value === 6).length;
      if (sixCount > 0) {
        result.damageAll += sixCount * 3;
        parts.push(`${sixCount} sixes fuel the charge! (+${sixCount * 3} damage)`);
      }
    }

    if (result.damageAll) {
      const aoeDmgScale = result.bonusDmgScale || (result.halfBonusDmg ? 0.5 : 1);
      const aoeBonus = aoeDmgScale !== 1 ? Math.floor(bonusDmg * aoeDmgScale) : bonusDmg;
      const aoeDmg = result.damageAll + aoeBonus;
      let bestOverkillPct = 0;
      let bestOverkillIdx = -1;
      // Mounted Sweep: target front row only, or backline if no front row exists
      let aoeTargetFilter = null;
      if (result.mountedSweep) {
        const hasFront = this.enemies.some(e => !e.dead && e.row === 'front');
        aoeTargetFilter = hasFront ? 'front' : 'back';
      }
      this.enemies.forEach(e => {
        if (!e.dead && (!aoeTargetFilter || e.row === aoeTargetFilter)) {
          let dmg = aoeDmg;
          const hpBefore = e.hp;
          const auraRed = this.getAuraDamageReduction(e);
          if (auraRed > 0) dmg = Math.max(1, dmg - auraRed);
          if (e.block && e.block > 0) {
            const absorbed = Math.min(e.block, dmg);
            e.block -= absorbed;
            dmg -= absorbed;
          }
          e.hp = Math.max(0, e.hp - dmg);
          unit.stats.damageDealt += dmg;
          if (dmg > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: e.index, damage: dmg });
          // Track best overkill for morale
          if (e.hp <= 0 && hpBefore > 0 && dmg > 0) {
            const okPct = (dmg - hpBefore) / dmg;
            if (okPct > bestOverkillPct) { bestOverkillPct = okPct; bestOverkillIdx = e.index; }
          }
          // Ballistarius pinning on AoE
          if (unit.classId === 'ballistarius' && dmg > 0 && e.hp > 0) e._pinned = true;
          // "Whenever deals damage" triggers per target on AoE
          if (dmg > 0 && e.hp > 0) {
            if (this.unitHasItem(unit, 'venomous_blade')) {
              const vbLv = this.getItemLevel(unit, 'venomous_blade');
              e.poison = (e.poison || 0) + vbLv;
              unit.stats.poisonInflicted += vbLv;
            }
            if (this.unitHasItem(unit, 'legion_composite_bow')) {
              const lcbLv = this.getItemLevel(unit, 'legion_composite_bow');
              e.poison = (e.poison || 0) + lcbLv;
              unit.stats.poisonInflicted += lcbLv;
            }
          }
          if (dmg > 0 && this.unitHasItem(unit, 'blood_iron_gladius') && unit.hp < unit.maxHp) {
            const bigLv = this.getItemLevel(unit, 'blood_iron_gladius');
            const bigHeal = 1 * bigLv;
            unit.hp = Math.min(unit.maxHp, unit.hp + bigHeal);
            unit.stats.healingDone += bigHeal;
          }
        }
      });
      parts.push(`${unit.name} uses ${skill.name} \u2014 deals ${aoeDmg} damage to all enemies.`);
      // Spirits of Arminius & Varus: AoE heals the other spirit 25% of damage dealt to each
      const spiritA = this.enemies.find(e => e.id === 'spirit_of_arminius' && !e.dead);
      const spiritV = this.enemies.find(e => e.id === 'spirit_of_varus' && !e.dead);
      if (spiritA && spiritV) {
        // Each spirit heals the other for 25% of AoE damage taken
        const healForV = Math.max(1, Math.floor(aoeDmg * 0.25));
        const healForA = Math.max(1, Math.floor(aoeDmg * 0.25));
        spiritV.hp = Math.min(spiritV.maxHp, spiritV.hp + healForV);
        spiritA.hp = Math.min(spiritA.maxHp, spiritA.hp + healForA);
        parts.push(`The spirits' bond pulses — each heals ${healForV} HP!`);
      }
      // AoE overkill morale
      if (bestOverkillPct >= 0.75) {
        this.morale = Math.min(100, this.morale + 2);
        parts.push('OVERKILL! (+2 Morale)');
        if (bestOverkillIdx >= 0 && this.onVisual) this.onVisual('statusText', { enemyIndex: bestOverkillIdx, text: 'OVERKILL!', color: 'var(--gold)' });
        if (this.onVisual) this.onVisual('morale', { amount: 2 });
      } else if (bestOverkillPct >= 0.6) {
        this.morale = Math.min(100, this.morale + 1);
        parts.push('Overkill! (+1 Morale)');
        if (bestOverkillIdx >= 0 && this.onVisual) this.onVisual('statusText', { enemyIndex: bestOverkillIdx, text: 'OVERKILL!', color: 'var(--gold)' });
        if (this.onVisual) this.onVisual('morale', { amount: 1 });
      }
    }
    // Consume all damage buffs after dealing damage
    if (result.consumeAllBuffs) {
      unit.buffs = [];
      parts.push(`All damage buffs consumed.`);
    }
    // Heal all allies
    if (result.healAll) {
      const baseHealAll = result.healAll + bonusHeal;
      this.party.forEach(u => {
        if (!u.downed) {
          let totalHeal = baseHealAll;
          // Resonance: double the heal for this unit
          if (u._resonance) {
            totalHeal *= 2;
            u._resonance = false;
            parts.push(`Resonance doubles healing on ${u.name}!`);
          }
          // Healer's Oath: healing below 25% HP heals double
          if (this.unitHasItem(unit, 'healers_oath') && u.hp <= u.maxHp * 0.25) {
            totalHeal *= 2;
            parts.push(`Healer's Oath doubles the heal on ${u.name}!`);
          }
          const before = u.hp;
          u.hp = Math.min(u.maxHp, u.hp + totalHeal);
          const actual = u.hp - before;
          unit.stats.healingDone += actual;
          // Bone Saw of Asclepius: healing grants target +2 damage per healed ally
          if (this.unitHasItem(unit, 'bone_saw_of_asclepius') && actual > 0) {
            u.buffs.push({ damage: 2, attacksLeft: 1 });
          }
          // Crown of Thorns: when healed, deal damage to all enemies (scales with level)
          if (this.unitHasItem(u, 'crown_of_thorns') && actual > 0) {
            const cotLv = this.getItemLevel(u, 'crown_of_thorns');
            const cotDmg = 2 * cotLv;
            this.enemies.forEach(e => { if (!e.dead) e.hp = Math.max(0, e.hp - cotDmg); });
            parts.push(`Crown of Thorns — ${cotDmg} damage to all enemies!`);
          }
          // Bitter Remedy: when this unit is healed, poison a random enemy (scales with level)
          if (this.unitHasItem(u, 'bitter_remedy') && actual > 0) {
            const brLv = this.getItemLevel(u, 'bitter_remedy');
            const brPoison = 1 * brLv;
            const aliveEnemies = this.enemies.filter(e => !e.dead);
            if (aliveEnemies.length > 0) {
              const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
              victim.poison = (victim.poison || 0) + brPoison;
              parts.push(`Bitter Remedy poisons ${victim.name}. (+${brPoison} Poison)`);
            }
          }
        }
      });
      // Herbalist's Satchel: healing applies poison per healed ally (scales with level)
      if (this.unitHasItem(unit, 'herbalists_satchel')) {
        const hsLv = this.getItemLevel(unit, 'herbalists_satchel');
        const hsPoison = 1 * hsLv;
        const healedCount = this.party.filter(u => !u.downed).length;
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        for (let h = 0; h < healedCount && aliveEnemies.length > 0; h++) {
          const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          victim.poison = (victim.poison || 0) + hsPoison;
          unit.stats.poisonInflicted += hsPoison;
        }
        if (healedCount > 0) parts.push(`Herbalist's Satchel spreads ${hsPoison} Poison (${healedCount} triggers).`);
      }
      // Marsh Root Brew: healing grants block to all healed allies (scales with level)
      if (this.unitHasItem(unit, 'marsh_root_brew')) {
        const mrbLv = this.getItemLevel(unit, 'marsh_root_brew');
        const mrbBlock = 1 * mrbLv;
        this.party.forEach(u => {
          if (!u.downed) {
            u.block = (u.block || 0) + mrbBlock;
          }
        });
        parts.push(`Marsh Root Brew grants ${mrbBlock} Block to all allies.`);
      }
      const bonusStr = bonusHeal > 0 ? ` (${result.healAll}+${bonusHeal})` : '';
      parts.push(`${unit.name} uses ${skill.name} \u2014 heals all allies for ${baseHealAll}${bonusStr} HP.`);
    }
    // Rallying Trumpet: heal 2 random allies, prioritizing those with enough missing HP
    if (result.rallyingTrumpet) {
      const healScale = result.bonusHealScale != null ? result.bonusHealScale : 1;
      const baseHeal = result.rallyingTrumpet + Math.floor(bonusHeal * healScale);
      const damaged = this.party.filter(u => !u.downed && u.hp < u.maxHp);
      if (damaged.length > 0) {
        // Prioritize allies who wouldn't overheal
        const worthy = damaged.filter(u => (u.maxHp - u.hp) >= baseHeal);
        const pool = worthy.length >= 2 ? worthy : damaged;
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, 2);
        targets.forEach(u => {
          let totalHeal = baseHeal;
          if (u._resonance) { totalHeal *= 2; u._resonance = false; parts.push(`Resonance doubles healing on ${u.name}!`); }
          const before = u.hp;
          u.hp = Math.min(u.maxHp, u.hp + totalHeal);
          const actual = u.hp - before;
          unit.stats.healingDone += actual;
          if (actual > 0) {
            parts.push(`Rallying Trumpet heals ${u.name} for ${actual} HP.`);
            if (this.onVisual) this.onVisual('unitHeal', { unitIndex: u.index, amount: actual });
            this.triggerOnHealEffects(u, actual);
          }
        });
      }
    }

    // Cleanse poison from target
    if (result.cleanse && result.target && result.target.poison > 0) {
      result.target.poison = 0;
      parts.push('Poison cleared.');
    }
    // Cleanse marks from target
    if (result.cleanseMarks && result.target) {
      if (result.target._huntMarked) { result.target._huntMarked = 0; parts.push('Mark cleared.'); }
    }
    // Cleanse stun from target
    if (result.cleanseStun && result.target) {
      if (result.target._stunNextTurn) { result.target._stunNextTurn = false; result.target._stunnedThisTurn = false; parts.push('Stun cleared.'); }
      if (result.target._stunnedThisTurn) { result.target._stunnedThisTurn = false; result.target.actedThisTurn = false; parts.push('Stun cleared — ready to act!'); }
    }
    if (result.morale) {
      const oldMorale = this.morale;
      this.morale = Math.max(0, Math.min(100, this.morale + result.morale));
      if (result.morale > 0) unit.stats.moraleRestored += this.morale - oldMorale;
      parts.push(`+${result.morale} Morale.`);
      if (this.onVisual) this.onVisual('morale', { amount: result.morale });
    }

    // Counter Stance: set flag on unit, checked during enemy damage
    if (result.counterStance) {
      unit._counterStance = result.counterStance;
      parts.push(`${unit.name} enters counter stance! (${result.counterStance} retaliatory damage)`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Counter', color: 'var(--gold)' });
    }

    // Shieldbreak: handled before damage (see above)

    // Overwatch: set flag on unit, checked during enemy damage
    if (result.overwatch) {
      unit._overwatch = result.overwatch;
      parts.push(`${unit.name} sets an overwatch! (${result.overwatch} damage to next attacker)`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Overwatch', color: 'var(--gold)' });
    }

    // Suppress: target deals 40% less damage for N turns
    if (result.suppress && result.target) {
      result.target._suppressed = result.suppress;
      parts.push(`${result.target.name} is suppressed! (-40% damage for ${result.suppress} turns)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Suppressed', color: '#aa66aa' });
    }

    // Stimulant: target ally can act again
    if (result.stimulant && result.target) {
      result.target.actedThisTurn = false;
      parts.push(`${result.target.name} is reinvigorated! Can act again this turn.`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Stimulant!', color: 'var(--green-bright)' });
    }

    // Transfusion: transfer HP from self to target (cost scales 0.5x, heal scales 1.5x with heal bonus)
    if (result.transfusion && result.target) {
      const selfCost = result.transfusion + Math.floor(bonusHeal * 0.5);
      const allyHeal = result.transfusion + Math.floor(bonusHeal * 1.5);
      const maxCost = Math.min(selfCost, unit.hp - 1);
      const maxHeal = Math.min(allyHeal, result.target.maxHp - result.target.hp);
      if (maxCost > 0 && maxHeal > 0) {
        unit.hp -= maxCost;
        result.target.hp += maxHeal;
        unit.stats.healingDone += maxHeal;
        parts.push(`${unit.name} sacrifices ${maxCost} HP \u2014 ${result.target.name} heals ${maxHeal} HP.`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: result.target.index, amount: maxHeal });
      } else {
        parts.push('No HP to transfer.');
      }
    }

    // Cripple: target deals 30% less damage for N actions
    if (result.cripple && result.target) {
      result.target._crippled = result.cripple;
      parts.push(`${result.target.name} is crippled! (-30% damage for ${result.cripple} actions)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Crippled', color: '#aa66aa' });
    }

    // Snare Trap: if target attacks this turn, takes damage and is stunned
    if (result.snareTrap && result.target) {
      result.target._snareTrap = result.snareTrap;
      parts.push(`A trap is set on ${result.target.name}!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Trapped', color: 'var(--gold)' });
    }

    // Caltrops: mark + snare trap on target and adjacent front-row enemies
    if (result.caltrops && result.target) {
      const caltropTargets = [result.target];
      // Find adjacent front-row enemies
      const sameRow = this.enemies.filter(e => !e.dead && e.row === 'front' && e !== result.target);
      sameRow.sort((a, b) => Math.abs(a.index - result.target.index) - Math.abs(b.index - result.target.index));
      const adjacent = sameRow.filter(e => Math.abs(e.index - result.target.index) <= 2).slice(0, 2);
      caltropTargets.push(...adjacent);
      const caltropBonus = Math.floor((unit.equipDamage || 0) * 0.3);
      const caltropDmg = result.caltrops + caltropBonus;
      caltropTargets.forEach(e => {
        e._marked = 2;
        e._snareTrap = caltropDmg;
      });
      const names = caltropTargets.map(e => e.name).join(', ');
      parts.push(`Caltrops! ${names} marked and trapped!`);
      caltropTargets.forEach(e => {
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: e.index, text: 'Caltrops!', color: 'var(--gold)' });
      });
    }

    // Stun: skip target's next action (with anti-stunlock protection)
    if (result.stun && result.target) {
      const alreadyStunned = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
      if (alreadyStunned >= 2) {
        parts.push(`${result.target.name} resists the stun — too many enemies already stunned.`);
      } else {
        result.target._skipNextAction = true;
        parts.push(`${result.target.name} is stunned!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Stunned!', color: '#aa66aa' });
      }
    }

    // Revive: bring a downed ally back
    if (result.revive && result.target && result.target.downed) {
      result.target.downed = false;
      const reviveHp = Math.max(1, Math.floor(result.target.maxHp * 0.25));
      result.target.hp = reviveHp;
      result.target.block = (result.target.block || 0) + reviveHp;
      parts.push(`${result.target.name} is revived at ${reviveHp} HP with ${reviveHp} Block!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Revived!', color: 'var(--green-bright)' });
      if (this.onVisual) this.onVisual('unitHeal', { unitIndex: result.target.index, amount: reviveHp });
    }

    // Morale Cost: spend morale to use the skill
    if (result.moraleCost) {
      this.morale = Math.max(0, this.morale - result.moraleCost);
      this.clampMorale();
      parts.push(`(-${result.moraleCost} Morale)`);
      if (this.onVisual) this.onVisual('morale', { amount: -result.moraleCost });
    }

    // Deafen: target's morale attacks have no effect for N turns
    if (result.deafen && result.target) {
      result.target._deafened = result.deafen;
      parts.push(`${result.target.name} is deafened! Morale attacks nullified for ${result.deafen} turns.`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Deafened', color: '#aa66aa' });
    }
    // Deafen All: all enemies' morale attacks nullified
    if (result.deafenAll) {
      this.enemies.forEach(e => {
        if (!e.dead) {
          e._deafened = result.deafenAll;
        }
      });
      parts.push(`All enemies deafened! Morale attacks nullified for ${result.deafenAll} turns.`);
    }

    // Resonance: mark ally, next heal doubled + grant block
    if (result.resonance && result.target) {
      result.target._resonance = true;
      parts.push(`${result.target.name} resonates with healing energy! Next heal doubled.`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: result.target.index, text: 'Resonance', color: 'var(--green-bright)' });
    }

    // Pull to Front: move enemy to front row
    if (result.pullToFront && result.target && result.target.row === 'back') {
      result.target.row = 'front';
      parts.push(`${result.target.name} is pulled to the front row!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Pulled!', color: 'var(--red-bright)' });
    }

    // Damage Shield: all allies take X% less damage next enemy turn
    if (result.damageShield && !result.divineIntercession) {
      this.party.forEach(u => { if (!u.downed) u._damageShield = result.damageShield; });
      const pct = Math.round((1 - result.damageShield) * 100);
      parts.push(`All allies take ${pct}% less damage next enemy turn.`);
    }

    // Divine Intercession: single target takes 50% less damage, attackers take retribution damage
    if (result.divineIntercession && result.target) {
      result.target._damageShield = result.damageShield || 0.5;
      result.target._divineRetribution = result.divineIntercession;
      parts.push(`${result.target.name} is shielded by Vesta — 50% less damage, attackers take ${result.divineIntercession} retribution damage.`);
    }

    // Smoke Screen: all enemies have X% chance to miss
    if (result.smokeScreen) {
      this.enemies.forEach(e => { if (!e.dead) e._smokeScreen = result.smokeScreen; });
      const pct = Math.round(result.smokeScreen * 100);
      parts.push(`Smoke covers the field! Enemies have ${pct}% chance to miss.`);
    }

    // Intercept: next attack on any ally hits this unit instead at half damage, reflects half, stuns attacker
    if (result.intercept) {
      unit._intercept = true;
      parts.push(`${unit.name} stands ready to intercept the next attack!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: unit.index, text: 'Intercept', color: 'var(--blue-bright)' });
    }

    // Avenger's Oath: bonus damage if ally is downed
    if (result.avengeDamage && result.target) {
      const anyDowned = this.party.some(u => u.downed);
      if (anyDowned) {
        const extraDmg = result.avengeDamage - (result.damage || 0);
        if (extraDmg > 0) {
          result.target.hp = Math.max(0, result.target.hp - extraDmg);
          unit.stats.damageDealt += extraDmg;
          parts.push(`AVENGER'S OATH! (+${extraDmg} bonus damage, ignores block)`);
        }
      }
    }

    // Shoulder Charge: knockback to back row, or bonus damage + stun if already back
    if (result.shoulderCharge && result.target) {
      if (result.target.row === 'front') {
        result.target.row = 'back';
        parts.push(`${result.target.name} is knocked to the back row!`);
      } else {
        // Already back row — deal 2 + scaled bonus damage (1.1x) and stun
        const scaledExtra = 2 + Math.floor(bonusDmg * 0.1);
        result.target.hp = Math.max(0, result.target.hp - scaledExtra);
        unit.stats.damageDealt += scaledExtra;
        if (this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: scaledExtra });
        const stunCount = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
        if (stunCount < 2) {
          result.target._skipNextAction = true;
          parts.push(`${result.target.name} has nowhere to go! (+${scaledExtra} bonus damage, stunned!)`);
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Stunned!', color: 'var(--red-bright)' });
        } else {
          parts.push(`${result.target.name} has nowhere to go! (+${scaledExtra} bonus damage)`);
        }
      }
    }

    // Echo on Kill: if target dies, chain damage to random other enemy
    if (result.echoOnKill && result.target && result.target.hp <= 0) {
      const others = this.enemies.filter(e => !e.dead && e !== result.target && e.hp > 0);
      if (others.length > 0) {
        const echoTarget = others[Math.floor(Math.random() * others.length)];
        echoTarget.hp = Math.max(0, echoTarget.hp - result.echoOnKill);
        unit.stats.damageDealt += result.echoOnKill;
        parts.push(`The blast echoes — ${echoTarget.name} takes ${result.echoOnKill} damage!`);
      }
    }

    // Warhorse Kick: stun target + random other front-row enemy (anti-stunlock)
    if (result.warhorseKick && result.target) {
      const stunCount = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
      if (stunCount < 2) {
        result.target._skipNextAction = true;
        parts.push(`${result.target.name} is stunned!`);
        let otherFront = this.enemies.filter(e => !e.dead && e.row === 'front' && e !== result.target && !e._skipNextAction);
        if (otherFront.length === 0) otherFront = this.enemies.filter(e => !e.dead && e !== result.target && !e._skipNextAction);
        const newStunCount = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
        if (otherFront.length > 0 && newStunCount < 2) {
          const secondTarget = otherFront[Math.floor(Math.random() * otherFront.length)];
          secondTarget._skipNextAction = true;
          parts.push(`${secondTarget.name} is also stunned!`);
        }
      } else {
        parts.push(`${result.target.name} resists — too many enemies already stunned.`);
      }
    }

    // Momentum Strike: deal damage per skill used this combat (scales with difficulty, 0.35 equipment scaling)
    if (result.momentumStrike && result.target) {
      const perAction = 1 + Math.floor((this.difficulty || 1) * 0.2);
      const momentum = Math.min(30, (this._totalSkillsUsed || 1) * perAction);
      const momentumBonus = Math.floor(bonusDmg * 0.35);
      let dmg = momentum + momentumBonus;
      // Block interaction
      if (result.target.block && result.target.block > 0) {
        const ab = Math.min(result.target.block, dmg);
        result.target.block -= ab;
        dmg -= ab;
        if (ab > 0) parts.push(`${result.target.name}'s block absorbs ${ab}.`);
      }
      result.target.hp = Math.max(0, result.target.hp - dmg);
      unit.stats.damageDealt += dmg;
      if (dmg > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: dmg });
      parts.push(`${unit.name} uses ${skill.name} — ${dmg} damage (${momentum} momentum).`);
    }

    // Breakneck Charge: deal sum of 2 dice as damage, stun target and self
    if (result.breakneckCharge && result.target) {
      const usedDice = this.dicePool.dice.filter(d => d.used).slice(-2);
      const dieSum = usedDice.reduce((s, d) => s + d.value, 0);
      let dmg = dieSum + Math.floor(bonusDmg * 1.3);
      // Block interaction
      if (result.target.block && result.target.block > 0) {
        const ab = Math.min(result.target.block, dmg);
        result.target.block -= ab;
        dmg -= ab;
        if (ab > 0) parts.push(`${result.target.name}'s block absorbs ${ab}.`);
      }
      result.target.hp = Math.max(0, result.target.hp - dmg);
      unit.stats.damageDealt += dmg;
      if (dmg > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: dmg });
      // Stun target (anti-stunlock)
      const stunCount = this.enemies.filter(e => !e.dead && e._skipNextAction).length;
      if (stunCount < 2) {
        result.target._skipNextAction = true;
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Stunned!', color: 'var(--red-bright)' });
      }
      // Stun self
      unit._stunNextTurn = true;
      parts.push(`${unit.name} crashes into ${result.target.name} for ${dmg} damage (dice ${usedDice.map(d => d.value).join('+')}). Both are stunned!`);
    }

    // All-In Charge: deal 10 + sum of rerolled unused dice as bonus damage
    if (result.allInCharge && result.target) {
      let baseDmg = 10 + bonusDmg;
      // Reroll all unused dice and add their values as bonus
      const unused = this.dicePool.dice.filter(d => !d.used);
      let rerollBonus = 0;
      unused.forEach(d => {
        d.value = Math.floor(Math.random() * 6) + 1;
        rerollBonus += d.value;
      });
      const totalDmg = baseDmg + rerollBonus;
      // Block interaction
      let dmg = totalDmg;
      if (result.target.block && result.target.block > 0) {
        const ab = Math.min(result.target.block, dmg);
        result.target.block -= ab;
        dmg -= ab;
        if (ab > 0) parts.push(`${result.target.name}'s block absorbs ${ab}.`);
      }
      result.target.hp = Math.max(0, result.target.hp - dmg);
      unit.stats.damageDealt += dmg;
      if (dmg > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: dmg });
      parts.push(`${unit.name} goes ALL IN — ${dmg} damage! (10 base + ${rerollBonus} from ${unused.length} rerolled dice)`);
    }

    // March Tempo: all allies can act again this turn
    if (result.marchTempo) {
      this.party.forEach(u => {
        if (!u.downed && u !== unit) {
          u.actedThisTurn = false;
        }
      });
      parts.push(`${unit.name} sounds the march tempo — all allies can act again!`);
    }

    // Shieldbreak All: remove all block from all enemies
    if (result.shieldbreakAll) {
      let totalRemoved = 0;
      this.enemies.forEach(e => {
        if (!e.dead && e.block > 0) {
          totalRemoved += e.block;
          e.block = 0;
        }
      });
      if (totalRemoved > 0) parts.push(`All enemy block shattered! (-${totalRemoved} Block total)`);
    }

    // Condemn: target takes +30% damage from all sources for N turns
    if (result.condemn && result.target) {
      result.target._condemned = result.condemn;
      parts.push(`${result.target.name} is condemned! (+30% damage from all sources for ${result.condemn} turns)`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: result.target.index, text: 'Condemned', color: 'var(--red-bright)' });
    }

    // --- NEW MECHANICS ---

    // Precision Drill: damage = higher die, block = lower die
    if (result.precisionDrill && result.target) {
      const usedDice = this.dicePool.dice.filter(d => d.used).slice(-2);
      const vals = usedDice.map(d => d.value).sort((a, b) => a - b);
      const loDie = vals[0] || 1;
      const hiDie = vals[1] || vals[0] || 1;
      const dmg = hiDie + bonusDmg;
      const blk = loDie + bonusBlock;
      unit.block = (unit.block || 0) + blk;
      unit.stats.blockGenerated += blk;
      let totalDmg = dmg;
      if (result.target.block > 0) { const ab = Math.min(result.target.block, totalDmg); result.target.block -= ab; totalDmg -= ab; }
      result.target.hp = Math.max(0, result.target.hp - totalDmg);
      unit.stats.damageDealt += totalDmg;
      if (totalDmg > 0 && this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: totalDmg });
      parts.push(`${unit.name} uses ${skill.name} — ${totalDmg} damage (die ${hiDie}), +${blk} Block (die ${loDie}).`);
    }

    // Fortified Strike: gain 2 block, deal damage = current block
    if (result.fortifiedStrike) {
      unit.block = (unit.block || 0) + 2;
      const blockDmg = unit.block + bonusDmg;
      if (result.target && result.target.hp !== undefined) {
        let dmg = blockDmg;
        if (result.target.block > 0) { const ab = Math.min(result.target.block, dmg); result.target.block -= ab; dmg -= ab; }
        result.target.hp = Math.max(0, result.target.hp - dmg);
        unit.stats.damageDealt += dmg;
        parts.push(`${unit.name} uses ${skill.name} — gains 2 Block, strikes for ${blockDmg} damage (${unit.block} Block).`);
      }
    }

    // Bonus dice next turn
    if (result.bonusDiceNext) {
      this._bonusDiceNext = (this._bonusDiceNext || 0) + result.bonusDiceNext;
      parts.push(`+${result.bonusDiceNext} bonus dice next turn.`);
    }

    // Cleanse All: clear poison and stun from all allies
    if (result.cleanseAll) {
      this.party.forEach(u => {
        if (!u.downed) {
          u.poison = 0;
          u._stunNextTurn = false;
          if (u._stunnedThisTurn) {
            u._stunnedThisTurn = false;
            u.actedThisTurn = false;
          }
        }
      });
      parts.push(`All allies cleansed of poison and stun.`);
    }

    // Triage Strike: damage weakest enemy (1.2x dmg scaling), heal weakest ally (1.05x heal scaling)
    if (result.triageStrike) {
      const baseDmg = result.triageStrike;
      const dmgAmt = baseDmg + Math.floor(bonusDmg * 1.2);
      const baseHealAmt = baseDmg + 1; // +1 base heal over damage
      const healAmt = baseHealAmt + Math.floor(bonusHeal * 1.05);
      const weakestEnemy = this.enemies.filter(e => !e.dead).sort((a, b) => a.hp - b.hp)[0];
      const weakestAlly = this.party.filter(u => !u.downed).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (weakestEnemy) {
        let dmg = dmgAmt;
        if (weakestEnemy.block > 0) { const ab = Math.min(weakestEnemy.block, dmg); weakestEnemy.block -= ab; dmg -= ab; }
        weakestEnemy.hp = Math.max(0, weakestEnemy.hp - dmg);
        unit.stats.damageDealt += dmg;
        parts.push(`${weakestEnemy.name} takes ${dmg} damage.`);
      }
      if (weakestAlly && weakestAlly.hp < weakestAlly.maxHp) {
        const heal = Math.min(healAmt, weakestAlly.maxHp - weakestAlly.hp);
        weakestAlly.hp += heal;
        unit.stats.healingDone += heal;
        parts.push(`${weakestAlly.name} heals ${heal} HP.`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: weakestAlly.index, amount: heal });
        this.triggerOnHealEffects(weakestAlly, heal);
      }
    }

    // Calculated Dosage: poison = unique die values, bonus damage if all unique
    if (result.calculatedDosage && result.target) {
      const allDice = this.dicePool.dice;
      const uniqueValues = new Set(allDice.map(d => d.value)).size;
      const poisonAmt = uniqueValues + (unit.equipPoison || 0);
      result.target.poison = (result.target.poison || 0) + poisonAmt;
      unit.stats.poisonInflicted += poisonAmt;
      parts.push(`${result.target.name} takes ${poisonAmt} Poison (${uniqueValues} unique dice).`);
      if (uniqueValues === allDice.length) {
        const bonusDamage = 4 + bonusDmg;
        if (result.target.block > 0) { const ab = Math.min(result.target.block, bonusDamage); result.target.block -= ab; }
        result.target.hp = Math.max(0, result.target.hp - bonusDamage);
        unit.stats.damageDealt += bonusDamage;
        parts.push(`All dice unique! ${bonusDamage} bonus damage!`);
      }
    }

    // Trick Shot: bouncing arrow, extra hits per additional 1 in dice pool
    if (result.trickShot && result.target) {
      const onesInPool = this.dicePool.dice.filter(d => d.value === 1 && !d.used).length;
      const alive = this.enemies.filter(e => !e.dead);
      let bounceTarget = result.target;
      for (let b = 0; b < onesInPool && alive.length > 1; b++) {
        const others = alive.filter(e => e !== bounceTarget);
        if (others.length === 0) break;
        bounceTarget = others[Math.floor(Math.random() * others.length)];
        const dmg = result.damage + Math.floor(bonusDmg * 0.35);
        bounceTarget.hp = Math.max(0, bounceTarget.hp - dmg);
        unit.stats.damageDealt += dmg;
        parts.push(`Arrow ricochets to ${bounceTarget.name} for ${dmg} damage!`);
      }
    }

    // Wilderness Instinct: 50% damage reduction this turn, heal+block next turn
    if (result.wildernessInstinct) {
      unit._damageShield = 0.5;
      unit._wildernessHealNext = true;
      parts.push(`${unit.name} takes cover. 50% damage reduction this turn. Heal and Block next turn.`);
    }

    // Fortune's Favor: reroll all unused dice + add 1 die this turn
    if (result.fortunesFavor) {
      this.dicePool.dice.forEach(d => {
        if (!d.used) d.value = Math.floor(Math.random() * 6) + 1;
      });
      // Add 1 bonus die
      const newDie = { id: 'fortune_' + Date.now(), value: Math.floor(Math.random() * 6) + 1, used: false };
      this.dicePool.dice.push(newDie);
      parts.push(`All dice rerolled! +1 bonus die!`);
    }

    // Free Action: unit can act again this turn
    if (result.freeAction) {
      unit.actedThisTurn = false;
      parts.push(`Free action — ${unit.name} can act again.`);
    }

    // Harmonic Frequency: pair-based heal or poison + free action
    if (result.harmonicFrequency) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const pairValue = usedDice.length >= 2 ? usedDice[usedDice.length - 1].value : 3;
      if (pairValue % 2 === 0) {
        // Even: heal all allies
        this.party.forEach(u => {
          if (!u.downed) {
            const heal = Math.min(pairValue, u.maxHp - u.hp);
            u.hp += heal;
            unit.stats.healingDone += heal;
            this.triggerOnHealEffects(u, heal);
          }
        });
        parts.push(`Harmonic healing! All allies heal ${pairValue} HP.`);
      } else {
        // Odd: poison all enemies
        this.enemies.forEach(e => {
          if (!e.dead) {
            e.poison = (e.poison || 0) + pairValue;
            unit.stats.poisonInflicted += pairValue;
          }
        });
        parts.push(`Discordant poison! All enemies take ${pairValue} Poison.`);
      }
    }

    // Flanking Strike: double vs back row, block vs front row
    if (result.flankingStrike && result.target) {
      if (result.target.row === 'back') {
        // Already dealt base damage — deal it again for double
        const extraDmg = result.damage + bonusDmg;
        result.target.hp = Math.max(0, result.target.hp - extraDmg);
        unit.stats.damageDealt += extraDmg;
        parts.push(`Flanking strike! Double damage to back row!`);
      } else {
        unit.block = (unit.block || 0) + 3;
        unit.stats.blockGenerated += 3;
        parts.push(`${unit.name} gains 3 Block from flanking.`);
      }
    }

    // Scouting Maneuver: mark random enemy, buff self
    if (result.scoutingManeuver) {
      const alive = this.enemies.filter(e => !e.dead);
      if (alive.length > 0) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        target._marked = 2;
        parts.push(`${target.name} is scouted and marked!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: target.index, text: 'Scouted', color: 'var(--gold)' });
      }
      unit.buffs.push({ damage: 3, attacksLeft: 2 });
      parts.push(`${unit.name} gains +3 damage (2 attacks).`);
    }

    // Heal Self
    if (result.healSelf && unit.hp < unit.maxHp) {
      const heal = Math.min(result.healSelf, unit.maxHp - unit.hp);
      unit.hp += heal;
      unit.stats.healingDone += heal;
      parts.push(`${unit.name} heals ${heal} HP.`);
      if (this.onVisual) this.onVisual('unitHeal', { unitIndex: unit.index, amount: heal });
    }

    // Skip Next Turn (self-stun for powerful abilities)
    if (result.skipNextTurn) {
      unit._stunNextTurn = true;
      parts.push(`${unit.name} is exhausted — skips next turn.`);
    }

    // Imperial Decree: both other allies perform basic attack
    if (result.imperialDecree) {
      this.party.forEach(u => {
        if (!u.downed && u !== unit) {
          const basicSkill = u.skills.find(s => s.starter && s.effects && s.effects.damage);
          if (basicSkill) {
            const targets = this.enemies.filter(e => !e.dead);
            if (targets.length > 0) {
              const target = targets[Math.floor(Math.random() * targets.length)];
              let dmg = (basicSkill.effects.damage || 0) + (u.equipDamage || 0);
              if (target.block > 0) { const ab = Math.min(target.block, dmg); target.block -= ab; dmg -= ab; }
              target.hp = Math.max(0, target.hp - dmg);
              u.stats.damageDealt += dmg;
              parts.push(`${u.name} strikes ${target.name} for ${dmg} damage!`);
            }
          }
        }
      });
    }

    // Last Stand: only works below 30% HP
    if (result.lastStand) {
      if (unit.hp > unit.maxHp * 0.3) {
        parts.push(`${unit.name} is too healthy for Last Stand. No effect.`);
        // Refund damage dealt
        if (result.target) { result.target.hp = Math.min(result.target.maxHp, result.target.hp + 20); }
      } else {
        // Heal for half damage dealt
        const healAmt = Math.min(10, unit.maxHp - unit.hp);
        unit.hp += healAmt;
        unit.stats.healingDone += healAmt;
        parts.push(`LAST STAND! ${unit.name} heals ${healAmt} HP!`);
        if (this.onVisual) this.onVisual('unitHeal', { unitIndex: unit.index, amount: healAmt });
      }
    }

    // Block Scale: multiply block bonus from equipment
    if (result.blockScale && result.blockAll) {
      // Already applied blockAll above, but we need to add the scaled equipment portion
      const extraBlock = Math.floor((unit.equipBlock || 0) * (result.blockScale - 1));
      if (extraBlock > 0) {
        this.party.forEach(u => { if (!u.downed) u.block = (u.block || 0) + extraBlock; });
        parts.push(`Block bonus scaled! +${extraBlock} extra Block each.`);
      }
    }

    // === NEW CLASS MECHANICS ===

    // Herb Poultice: poison a random enemy when healing
    if (result.herbPoulticePoison) {
      const aliveEnemies = this.enemies.filter(e => !e.dead);
      if (aliveEnemies.length > 0) {
        const victim = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        const poisonAmt = 1 + (unit.equipPoison || 0);
        victim.poison = (victim.poison || 0) + poisonAmt;
        unit.stats.poisonInflicted += poisonAmt;
        parts.push(`Herb poisons ${victim.name}. (+${poisonAmt} Poison)`);
      }
    }

    // Wolfbite: if target had block before damage, apply 6 poison
    if (result.wolfbite && result.target && result._targetHadBlock) {
      const poisonAmt = 7 + (unit.equipPoison || 0);
      result.target.poison = (result.target.poison || 0) + poisonAmt;
      unit.stats.poisonInflicted += poisonAmt;
      parts.push(`Target had Block — Wolfbite applies ${poisonAmt} Poison!`);
    }

    // Shield Wall Dance: gain block = pair value x2
    if (result.shieldWallDance) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const pairVal = usedDice.length >= 2 ? usedDice[usedDice.length - 1].value : 3;
      const blk = pairVal * 2 + (unit.equipBlock || 0);
      unit.block = (unit.block || 0) + blk;
      unit.stats.blockGenerated += blk;
      parts.push(`${unit.name} gains ${blk} Block (pair of ${pairVal}s).`);
    }

    // Predator's Pounce: bonus damage = 50% of current block
    if (result.predatorsPounce && result.target) {
      const blockBonus = Math.floor((unit.block || 0) * 0.5);
      if (blockBonus > 0 && result.target.hp > 0) {
        result.target.hp = Math.max(0, result.target.hp - blockBonus);
        unit.stats.damageDealt += blockBonus;
        parts.push(`Predator's Pounce! +${blockBonus} bonus damage from Block!`);
      }
    }

    // Flame Touch: heal a random wounded ally (1 + heal bonuses, scaled by bonusHealScale)
    // Prioritize allies with enough missing HP to fully use the heal
    if (result.flameTouch) {
      const damaged = this.party.filter(u => !u.downed && u.hp < u.maxHp);
      if (damaged.length > 0) {
        const healAmt = 1 + bonusHeal;
        const worthyTargets = damaged.filter(u => (u.maxHp - u.hp) >= healAmt);
        const pool = worthyTargets.length > 0 ? worthyTargets : damaged;
        const target = pool[Math.floor(Math.random() * pool.length)];
        const heal = Math.min(Math.max(1, healAmt), target.maxHp - target.hp);
        target.hp += heal;
        unit.stats.healingDone += heal;
        if (heal > 0) parts.push(`Heals ${target.name} for ${heal} HP.`);
        this.triggerOnHealEffects(target, heal);
      }
    }

    // Vesta's Judgment: +66% at 70+ morale, +66% at 85+
    if (result.vestasJudgment && result.target) {
      let extraDmg = 0;
      if (this.morale >= 70) extraDmg += Math.floor(result.damage * 0.66);
      if (this.morale >= 85) extraDmg += Math.floor(result.damage * 0.66);
      if (extraDmg > 0) {
        result.target.hp = Math.max(0, result.target.hp - extraDmg);
        unit.stats.damageDealt += extraDmg;
        if (this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: extraDmg });
        parts.push(`Vesta's fire burns! +${extraDmg} divine damage!`);
      }
    }

    // Litany of Courage: morale = die x2, grant ally extra action (player chooses)
    if (result.litanyOfCourage) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const dieVal = usedDice.length > 0 ? usedDice[usedDice.length - 1].value : 3;
      const moraleGain = dieVal * 2;
      this.morale = Math.min(100, this.morale + moraleGain);
      parts.push(`+${moraleGain} Morale.`);
      if (this.onVisual) this.onVisual('morale', { amount: moraleGain });
      // Let the player choose which acted ally gets the extra action
      const others = this.party.filter(u => !u.downed && u !== unit && u.actedThisTurn);
      if (others.length === 1) {
        // Only one option — auto-pick
        others[0].actedThisTurn = false;
        parts.push(`${others[0].name} is inspired to act again!`);
      } else if (others.length > 1) {
        // Multiple options — defer to player choice
        this._pendingExtraAction = others.map(u => u.index);
        parts.push(`Choose an ally to inspire.`);
      }
    }

    // Flame Shield: block and morale = pair value
    if (result.flameShield) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const pairVal = usedDice.length >= 2 ? usedDice[usedDice.length - 1].value : 3;
      this.party.forEach(u => {
        if (!u.downed) {
          u.block = (u.block || 0) + pairVal;
          u.stats.blockGenerated += pairVal;
        }
      });
      this.morale = Math.min(100, this.morale + pairVal);
      parts.push(`Flame Shield! +${pairVal} Block all, +${pairVal} Morale.`);
    }

    // Wrath of Vesta: 2 poison to 2 random enemies, scaled by morale
    if (result.wrathOfVesta) {
      let poisonAmt = 2 + (unit.equipPoison || 0);
      if (this.morale >= 70) poisonAmt = Math.floor(poisonAmt * 1.5);
      if (this.morale >= 85) poisonAmt = Math.floor(poisonAmt * 1.5);
      const alive = this.enemies.filter(e => !e.dead);
      const shuffled = alive.sort(() => Math.random() - 0.5).slice(0, 2);
      shuffled.forEach(e => {
        e.poison = (e.poison || 0) + poisonAmt;
        unit.stats.poisonInflicted += poisonAmt;
      });
      parts.push(`Wrath of Vesta! ${poisonAmt} Poison to ${shuffled.map(e => e.name).join(' and ')}.`);
    }

    // Resurrection Prayer: Vestalis loses HP = revived HP, gains that as Block
    if (result.resurrectionPrayer && result.target && !result.target.downed) {
      // Target was just revived by the revive effect above
      const reviveHp = result.target.hp;
      const cost = Math.min(reviveHp, unit.hp - 1);
      unit.hp -= cost;
      unit.block = (unit.block || 0) + cost;
      parts.push(`Vestalis sacrifices ${cost} HP, gains ${cost} Block.`);
    }

    // Laced Blade: poison = die value
    if (result.lacedBlade && result.target) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const dieVal = usedDice.length > 0 ? usedDice[usedDice.length - 1].value : 3;
      const poisonAmt = dieVal + (unit.equipPoison || 0);
      result.target.poison = (result.target.poison || 0) + poisonAmt;
      unit.stats.poisonInflicted += poisonAmt;
      parts.push(`Laced Blade! ${poisonAmt} Poison (die ${dieVal}).`);
    }

    // Misdirection: give ally taunt + 3 block per living enemy
    if (result.misdirection && result.target) {
      result.target.taunt = true;
      const livingEnemies = this.enemies.filter(e => !e.dead).length;
      const blk = Math.floor(livingEnemies * (3 + (unit.equipBlock || 0) * 0.65));
      result.target.block = (result.target.block || 0) + blk;
      result.target.stats.blockGenerated += blk;
      parts.push(`${result.target.name} taunts! +${blk} Block (${livingEnemies} enemies).`);
    }

    // Dead Drop: become untargetable this turn
    if (result.deadDrop) {
      unit._untargetable = true;
      parts.push(`${unit.name} vanishes into shadow.`);
    }

    // Shadow Network: allies apply 2 poison on attack for 2 attacks, mark all
    if (result.shadowNetwork) {
      this.party.forEach(u => {
        if (!u.downed && u !== unit) {
          u._poisonOnAttack = { amount: 2, attacks: 2 };
        }
      });
      this.enemies.forEach(e => { if (!e.dead) e._marked = 2; });
      parts.push(`All enemies marked! Allies apply 2 Poison on attack for 2 attacks.`);
    }

    // Assassination: triple damage vs marked/condemned
    if (result.assassination && result.target) {
      const isMarkedOrCondemned = (result.target._marked && result.target._marked > 0) || (result.target._condemned && result.target._condemned > 0);
      if (isMarkedOrCondemned) {
        // Already dealt base damage — deal 2x more for triple total
        const extraDmg = (result.damage + Math.floor(bonusDmg * 0.5)) * 2;
        result.target.hp = Math.max(0, result.target.hp - extraDmg);
        unit.stats.damageDealt += extraDmg;
        if (this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: extraDmg });
        parts.push(`ASSASSINATION! Triple damage on marked target!`);
      }
    }

    // Contingency Plan: prevent downing for 1 turn
    if (result.contingencyPlan) {
      this.party.forEach(u => { if (!u.downed) u._contingency = true; });
      parts.push(`Contingency active — no ally can be downed this turn.`);
    }

    // Deep Cover: +3 dice this turn and next, +5 block each turn, stunned both
    if (result.deepCover) {
      // Add 3 dice immediately
      for (let d = 0; d < 3; d++) {
        this.dicePool.dice.push({ id: 'deep_' + Date.now() + d, value: Math.floor(Math.random() * 6) + 1, used: false });
      }
      this._bonusDiceNext = (this._bonusDiceNext || 0) + 3;
      // Block this turn
      unit.block = (unit.block || 0) + 5;
      unit.stats.blockGenerated += 5;
      // Block next turn too
      unit._deepCoverBlockNext = 5;
      unit._stunNextTurn = true;
      unit.actedThisTurn = true;
      parts.push(`Deep Cover! +3 dice and +5 Block now and next turn. ${unit.name} is stunned.`);
    }

    // Mounted Sweep: gain 1 block per enemy hit
    if (result.mountedSweep) {
      const hasFront = this.enemies.some(e => !e.dead && e.row === 'front');
      const hitRow = hasFront ? 'front' : 'back';
      const hitCount = this.enemies.filter(e => !e.dead && e.row === hitRow).length;
      if (hitCount > 0) {
        unit.block = (unit.block || 0) + hitCount;
        unit.stats.blockGenerated += hitCount;
        parts.push(`+${hitCount} Block from sweep.`);
      }
    }

    // Armored Advance: block = pair value (double for self), roll extra die
    if (result.armoredAdvance) {
      const usedDice = this.dicePool.dice.filter(d => d.used);
      const pairVal = usedDice.length >= 2 ? usedDice[usedDice.length - 1].value : 3;
      this.party.forEach(u => {
        if (!u.downed) {
          const blk = u === unit ? pairVal * 2 : pairVal;
          u.block = (u.block || 0) + blk;
          u.stats.blockGenerated += blk;
        }
      });
      // Roll an extra die immediately
      this.dicePool.dice.push({ id: 'advance_' + Date.now(), value: Math.floor(Math.random() * 6) + 1, used: false });
      parts.push(`Armored Advance! +${pairVal} Block all (${pairVal * 2} self). Extra die rolled!`);
    }

    // Destrier's Fury: strip enemy block, deal that as damage
    if (result.destriersFury && result.target) {
      const stripped = result.target.block || 0;
      result.target.block = 0;
      if (stripped > 0) {
        result.target.hp = Math.max(0, result.target.hp - stripped);
        unit.stats.damageDealt += stripped;
        parts.push(`Destrier's Fury strips ${stripped} Block and deals ${stripped} damage!`);
        if (this.onVisual) this.onVisual('enemyHit', { enemyIndex: result.target.index, damage: stripped });
      } else {
        parts.push(`Target has no Block to strip.`);
      }
    }

    // Cataphract's Doom: allies gain block = damage dealt to each enemy
    if (result.cataphractsDoom) {
      let totalBlockGained = 0;
      this.enemies.forEach(e => {
        if (!e.dead) {
          const dmgDealt = Math.min(result.damageAll + bonusDmg, e.hp); // approximate damage dealt
          totalBlockGained += dmgDealt;
        }
      });
      const perAlly = Math.floor(totalBlockGained / Math.max(1, this.party.filter(u => !u.downed).length));
      this.party.forEach(u => {
        if (!u.downed) {
          u.block = (u.block || 0) + perAlly;
          u.stats.blockGenerated += perAlly;
        }
      });
      parts.push(`Doom! All allies gain ${perAlly} Block from the devastation.`);
    }

    if (parts.length === 0) parts.push(`${unit.name} uses ${skill.name}.`);
    return parts.join(' ');
  }

  triggerVictory() {
    this.phase = PHASE.VICTORY;
    const victoryMorale = 4 + Math.floor((this.difficulty || 1) / 3);
    this.morale = Math.min(100, this.morale + victoryMorale);
    this.addLog(`All enemies defeated! (+${victoryMorale} Morale)`);
    if (this.onVisual) this.onVisual('morale', { amount: victoryMorale });

    // Boss encounter bonus: ensure morale is at least 75 after boss victory
    const killedBoss = this.enemies.find(e => e.isBoss && e.dead);
    if (killedBoss && this.morale < 75) {
      const bossBonus = 75 - this.morale;
      this.morale = 75;
      this.addLog(`The champion is slain! Your men roar in triumph! (+${bossBonus} Morale)`);
      if (this.onVisual) this.onVisual('morale', { amount: bossBonus });
    }

    // Clear stuns and per-combat debuffs from party
    this.party.forEach(u => {
      u._stunNextTurn = false;
      u._stunnedThisTurn = false;
      u.actedThisTurn = false;
    });

    // Immediate update so morale bar and mood reflect the victory right away
    this.update();
    const fast = typeof isFastMode === 'function' && isFastMode();
    setTimeout(() => this.update(), fast ? 300 : 2000);
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

          // Spectral killed — permanently remove from future story boss fights
          if (e._isSpectral && e._spectralOf && this._runSpectralDefeated) {
            this._runSpectralDefeated.add(e._spectralOf);
          }

          // Morale restored on kill — based on enemy base maxHp, doubled for seers
          const baseHp = ENEMY_DATA[e.id] ? ENEMY_DATA[e.id].maxHp : e.maxHp;
          let moraleRestore;
          // Sacrifice the Standard: suppress morale from kills
          if (this._noKillMorale) {
            moraleRestore = 0;
          } else if (e.isBoss && !e._isSpectral) {
            // Track boss kills for final boss spectral images
            if (!this.runKilledBosses.includes(e.id)) this.runKilledBosses.push(e.id);
            // Boss: restore to 75, or +12 if already above 75
            if (this.morale >= 75) {
              moraleRestore = 12;
            } else {
              moraleRestore = 75 - this.morale;
            }
          } else {
            const diffBonus = Math.floor((this.difficulty || 1) / 3);
            moraleRestore = (baseHp > 10 ? 3 : 2) + diffBonus;
          }
          if (e.deathMoraleMultiplier) moraleRestore *= e.deathMoraleMultiplier;
          if (this.partyHasItem('chiefs_spear')) {
            const csLv = this.getPartyItemLevel('chiefs_spear');
            moraleRestore += 2 + (csLv - 1);
          }
          // Sword of Germanicus: kills grant morale and heal (scales with level)
          if (this.partyHasItem('sword_of_germanicus')) {
            const sogLv = this.getPartyItemLevel('sword_of_germanicus');
            moraleRestore += 3 + (sogLv - 1);
            this.party.forEach(u => {
              if (!u.downed && this.unitHasItem(u, 'sword_of_germanicus') && u.hp < u.maxHp) {
                const healAmt = Math.min(2 + Math.floor(sogLv / 2), u.maxHp - u.hp);
                u.hp += healAmt;
                if (healAmt > 0) this.addLog(`Sword of Germanicus heals ${u.name} for ${healAmt} HP.`);
              }
            });
          }
          this.morale = Math.max(0, Math.min(100, this.morale + moraleRestore));
          if (moraleRestore >= 0) {
            this.addLog(`Your men rally! (+${moraleRestore} Morale)`);
          } else {
            this.addLog(`The men recoil in horror. (${moraleRestore} Morale)`);
          }
          if (this.onVisual) this.onVisual('morale', { amount: moraleRestore });

          // Fang Necklace: killing an enemy grants damage buff for 2 attacks (scales with level)
          this.party.forEach(u => {
            if (!u.downed && this.unitHasItem(u, 'fang_necklace')) {
              const fnLv = this.getItemLevel(u, 'fang_necklace');
              const fnDmg = 1 * fnLv;
              u.buffs.push({ damage: fnDmg, attacksLeft: 2 });
              this.addLog(`${u.name}'s Fang Necklace pulses — +${fnDmg} damage (2 attacks).`);
            }
          });

          // Vanguard's Banner: kills grant all allies block (scales with level)
          if (this.partyHasItem('vanguards_banner')) {
            const vbLv = this.getPartyItemLevel('vanguards_banner');
            const vbBlock = 2 + (vbLv - 1);
            this.party.forEach(u => {
              if (!u.downed) {
                u.block = (u.block || 0) + vbBlock;
              }
            });
            this.addLog(`Vanguard's Banner — all allies gain ${vbBlock} Block.`);
          }

          if (e.deathPoison) {
            this.party.forEach(u => {
              if (!u.downed) u.poison = (u.poison || 0) + e.deathPoison;
            });
            this.addLog(`${e.name} bursts — toxic innards spray the party! (+${e.deathPoison} Poison to all)`);
          }

          if (e.deathDamageEnemy) {
            this.party.forEach(u => {
              if (!u.downed) {
                let dmg = e.deathDamageEnemy;
                if (u.block > 0) {
                  const absorbed = Math.min(u.block, dmg);
                  u.block -= absorbed;
                  dmg -= absorbed;
                }
                u.hp = Math.max(0, u.hp - dmg);
                u.stats.damageTaken += dmg;
                if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: dmg });
              }
            });
            this.addLog(`${e.name} explodes! All soldiers take ${e.deathDamageEnemy} damage!`);
          }

          // --- Boss-specific death reactions ---

          // Arminius's Champion: revenge — deal 7 damage when any ally dies
          const champion = this.enemies.find(b => b.id === 'arminius_champion' && !b.dead && b !== e);
          if (champion && !e.isBoss) {
            champion.row = 'front';
            // Damage a random alive party member
            const aliveParty = this.party.filter(u => !u.downed);
            if (aliveParty.length > 0) {
              const victim = aliveParty[Math.floor(Math.random() * aliveParty.length)];
              victim.hp = Math.max(1, victim.hp - 7);
              victim.stats.damageTaken += 7;
              this.addLog(`${champion.name} charges forward in rage and strikes ${victim.name} for 7 damage!`);
              if (this.onVisual) this.onVisual('unitHit', { unitIndex: victim.index, damage: 7 });
            }
          }

          // Grove Witch death: all healing totems die with her
          if (e.id === 'grove_witch') {
            this.enemies.forEach(t => {
              if (!t.dead && t.id === 'healing_totem') {
                t.hp = 0; t.dead = true;
                this.killedEnemies.push(t.id);
                this.totalEnemiesKilled++;
                this.addLog(`${t.name} withers and crumbles!`);
              }
            });
          }

          // Serpent Shaman: when a snake dies, poison a random player unit (3)
          const shamanAlive = this.enemies.find(b => b.id === 'serpent_shaman' && !b.dead);
          if (shamanAlive && (e.id === 'fen_viper' || e.id === 'serpent_shade')) {
            const aliveParty = this.party.filter(u => !u.downed);
            if (aliveParty.length > 0) {
              const victim = aliveParty[Math.floor(Math.random() * aliveParty.length)];
              const poisonAmt = 3;
              victim.poison = (victim.poison || 0) + poisonAmt;
              this.addLog(`${shamanAlive.name} hisses — ${victim.name} is poisoned in revenge! (+${poisonAmt} Poison)`);
              if (this.onVisual) this.onVisual('unitPoison', { unitIndex: victim.index, amount: poisonAmt });
            }
          }

          // Mire Mother: gains +2 damage per action when a boar dies
          const mireMother = this.enemies.find(b => b.id === 'mire_mother' && !b.dead);
          if (mireMother && (e.id === 'boar_youngling' || e.id === 'war_boar')) {
            mireMother.actions.forEach(a => { if (a.damage > 0) a.damage += 2; });
            this.addLog(`${mireMother.name} howls with rage! Her attacks grow stronger!`);
          }

          // Leech Mound: on death, spawn 5 leeches
          if (e.id === 'leech_mound') {
            const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
            for (let li = 0; li < 5 && this.enemies.filter(en => !en.dead).length < 6; li++) {
              this.spawnBossMinion('mire_leech');
            }
            this.addLog('The Leech Mound bursts apart — leeches swarm everywhere!');
            if (this.onVisual) this.onVisual('screenShake', {});
          }

          // Lesser Leech Mound: on death, spawn 2 leeches (no reform)
          if (e.id === 'lesser_leech_mound') {
            for (let li = 0; li < 2 && this.enemies.filter(en => !en.dead).length < 6; li++) {
              this.spawnBossMinion('mire_leech');
            }
            this.addLog('The lesser mound splits — more leeches crawl free!');
          }

          // Ursus Ferox: enrages when a cub dies — gains +3 damage permanently
          const ursus = this.enemies.find(b => b.id === 'ursus_ferox' && !b.dead);
          if (ursus && e.id === 'bone_gnawer_cub') {
            ursus.actions.forEach(a => { if (a.damage > 0) a.damage += 3; });
            this.addLog(`${ursus.name} roars in fury! Its attacks grow deadlier!`);
            if (this.onVisual) this.onVisual('statusText', { enemyIndex: ursus.index, text: 'ENRAGED!', color: 'var(--red-bright)' });
          }

          // Revenant of Ariovistus: consumes fallen guardians — heals and gains damage
          const revenant = this.enemies.find(b => b.id === 'revenant_of_ariovistus' && !b.dead);
          if (revenant && e.id === 'barrow_guardian') {
            const healAmt = Math.min(8, revenant.maxHp - revenant.hp);
            revenant.hp += healAmt;
            revenant.actions.forEach(a => { if (a.damage > 0) a.damage += 2; });
            revenant.block = (revenant.block || 0) + 5;
            this.addLog(`${revenant.name} consumes the fallen guardian! (+${healAmt} HP, +2 damage, +5 Block)`);
            if (this.onVisual) this.onVisual('statusText', { enemyIndex: revenant.index, text: 'Consumed!', color: 'var(--purple)' });
            // Move to front row when 2+ guardians have fallen
            const deadGuardians = this.enemies.filter(g => g.id === 'barrow_guardian' && g.dead).length;
            if (deadGuardians >= 2 && revenant.row === 'back') {
              revenant.row = 'front';
              this.addLog(`${revenant.name} strides forward from the darkness! The king fights!`);
              if (this.onVisual) this.onVisual('screenShake', {});
            }
          }

          // Bone Speaker: raise dead allies as bone totems
          const boneSpeaker = this.enemies.find(b => b.id === 'bone_speaker' && !b.dead);
          if (boneSpeaker && !e.isBoss && !e.isStructure && e.id !== 'bone_totem' && e.id !== 'healing_totem' && !e._raisedAsTotem) {
            e._raisedAsTotem = true;
            if (this.enemies.filter(en => !en.dead).length < 6) {
              const totem = {
                index: this.enemies.length,
                id: 'bone_totem',
                name: `${e.name}'s Bones`,
                maxHp: 15,
                hp: 15,
                row: 'front',
                damage: [0, 0],
                speed: 0,
                xpValue: 2,
                ai: 'passive',
                isStructure: true,
                stunOnDeath: true,
                dead: false,
                poison: 0,
                block: 25,
                justSpawned: true,
                actions: [{ name: 'Rattle', damage: 0, morale: -6, chance: 1.0, text: 'rattles with dark energy' }],
              };
              this.enemies.push(totem);
              this.addLog(`${boneSpeaker.name} raises ${e.name}'s bones as a totem!`);
              setTimeout(() => { totem.justSpawned = false; this.update(); }, 500);
            }
          }

          // Spirits of Arminius & Varus: if one dies, start resurrection timer on the other
          if (e.id === 'spirit_of_arminius' || e.id === 'spirit_of_varus') {
            const otherId = e.id === 'spirit_of_arminius' ? 'spirit_of_varus' : 'spirit_of_arminius';
            const other = this.enemies.find(b => b.id === otherId && !b.dead);
            if (other) {
              // The surviving spirit will resurrect the fallen one after 2 turns
              other._resurrectTarget = e;
              other._resurrectTimer = 2;
              this.addLog(`${other.name} begins channeling — the fallen spirit will rise again in 2 turns!`);
            }
          }

          // Lindwurm Lord: on death, transform into a random second form
          if (e.id === 'lindwurm_lord' && !e._transformedAlready) {
            e._transformedAlready = true;
            const forms = ['lord_of_lies', 'lord_of_future_sight', 'undefeated_lord'];
            const chosenId = forms[Math.floor(Math.random() * forms.length)];
            const formDef = ENEMY_DATA[chosenId];
            if (formDef) {
              const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
              const scaledMaxHp = Math.round(formDef.maxHp * this.getHpScale(diffBonus));
              const scaledActions = formDef.actions.map(a => ({
                ...a,
                damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
                morale: a.morale ? Math.round(a.morale * (1 + diffBonus * 0.15)) : undefined,
                poisonTarget: a.poisonTarget ? a.poisonTarget + Math.floor(diffBonus * 0.5) : undefined,
                blockSelf: a.blockSelf ? a.blockSelf + diffBonus : undefined,
                blockAllEnemies: a.blockAllEnemies ? a.blockAllEnemies + diffBonus : undefined,
              }));
              const startBlock = Math.floor(diffBonus * 1.5);
              const form = {
                index: this.enemies.length,
                id: chosenId,
                name: formDef.name,
                maxHp: scaledMaxHp,
                hp: scaledMaxHp,
                row: formDef.row,
                damage: formDef.damage.map(d => Math.round(d * (1 + diffBonus * 0.35))),
                speed: formDef.speed,
                xpValue: formDef.xpValue,
                isBoss: true,
                ai: formDef.ai,
                description: formDef.description,
                actions: scaledActions,
                dead: false,
                poison: 0,
                block: startBlock,
                justSpawned: true,
                woundedDoubleAttack: formDef.woundedDoubleAttack || false,
                _turnsAlive: 0,
              };
              this.enemies.push(form);
              this.addLog(`The Lindwurm Lord convulses — its flesh tears apart and reforms! ${form.name} rises!`);
              if (this.onVisual) this.onVisual('screenShake', {});
              if (this.onVisual) this.onVisual('statusText', { enemyIndex: form.index, text: 'Transformed!', color: 'var(--red-bright)' });
              setTimeout(() => { form.justSpawned = false; this.update(); }, 500);
            }
          }

          // Bone Totem: destroying it stuns the killer (skip next turn) — anti-stunlock
          if (e.stunOnDeath) {
            const partyStunned = this.party.filter(u => !u.downed && u._stunNextTurn).length;
            if (partyStunned < 2) {
              const lastActor = this.party.find(u => u.actedThisTurn && !u.downed);
              if (lastActor && !lastActor._stunNextTurn) {
                lastActor._stunNextTurn = true;
                this.addLog(`The bones shatter — ${lastActor.name} is stunned next turn!`);
              }
            } else {
              this.addLog(`The bones shatter — but the curse dissipates, too many already stunned.`);
            }
          }
        }
      }
    }
    // Safety: if all enemies are dead after processing deaths, trigger victory
    if (this.enemies.length > 0 && this.enemies.every(e => e.dead) && this.phase !== PHASE.VICTORY && this.phase !== PHASE.DEFEAT) {
      this.triggerVictory();
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

    // Morale decay — escalates each turn, applied at end of player turn
    const helmCarrier = this.party.find(u => !u.downed && this.unitHasItem(u, 'champions_helm'));
    const helmReduction = helmCarrier ? this.getItemLevel(helmCarrier, 'champions_helm') : 0;
    const rawDiff = (this.difficulty || 1) - 1;
    const diffDecay = rawDiff <= 4 ? rawDiff : 4 + Math.floor((rawDiff - 4) / 2);
    const curseDecay = this.getActiveCurses().includes('witchs_gaze') ? 2 : 0;
    const moraleDecay = Math.max(0, this.turn + diffDecay + curseDecay - helmReduction);
    this.morale = Math.max(0, this.morale - moraleDecay);
    this.clampMorale();
    if (moraleDecay > 0) {
      this.addLog(`The forest weighs on your men. (-${moraleDecay} Morale)`);
      if (this.onVisual) this.onVisual('morale', { amount: -moraleDecay });
    }

    // Poison tick on allies at end of player turn
    this._lastAttackerName = 'Poison';
    this.party.forEach(u => {
      if (!u.downed && u.poison > 0) {
        const poisonDmg = u.poison;
        u.hp = Math.max(0, u.hp - poisonDmg);
        u.stats.damageTaken += poisonDmg;
        this.addLog(`${u.name} takes ${poisonDmg} poison damage.`);
        if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: poisonDmg, type: 'poison' });
        u.poison = Math.max(0, u.poison - 1);
      }
    });
    this.checkPartyDowned();
    if (this.party.every(u => u.downed)) {
      this.phase = PHASE.DEFEAT;
      this.addLog('The last cohort falls to poison...');
      this.update();
      return;
    }

    this.phase = PHASE.ENEMY_TURN;
    this.update();
    const fast = typeof isFastMode === 'function' && isFastMode();
    setTimeout(() => this.executeEnemyTurn(), fast ? 400 : 2200);
  }

  // --- Enemy turn (sequential) ---
  executeEnemyTurn() {
    // Clear enemy block, tick cooldowns, track turns alive, handle phase shifts
    this.enemies.forEach(e => {
      if (!e.dead) e.block = 0;
      e._spawnedLastTurn = false;
      if (e._actionCooldowns) {
        for (const name in e._actionCooldowns) {
          if (e._actionCooldowns[name] > 0) e._actionCooldowns[name]--;
        }
      }
      // Tick down marks and condemn
      if (e._marked && e._marked > 0) e._marked--;
      if (e._condemned && e._condemned > 0) e._condemned--;
      // Track turns alive for phase shift enemies
      if (!e.dead) {
        e._turnsAlive = (e._turnsAlive || 0) + 1;
        // Phase shift: move to new row after N turns
        if (e.phaseShift && e._turnsAlive > e.phaseShift.afterTurns && e.row !== e.phaseShift.toRow) {
          e.row = e.phaseShift.toRow;
          this.addLog(`${e.name} charges to the ${e.phaseShift.toRow} row!`);
        }
      }
    });
    const alive = this.enemies.filter(e => !e.dead);
    if (alive.length === 0) return;

    // Lindwurm Lord: devour sheep to heal and gain damage at start of enemy turn
    const lindwurmLord = alive.find(e => e.id === 'lindwurm_lord');
    if (lindwurmLord) {
      const sheep = alive.filter(e => e.id === 'lair_sheep');
      for (const s of sheep) {
        const healAmt = Math.min(12, lindwurmLord.maxHp - lindwurmLord.hp);
        lindwurmLord.actions.forEach(a => { if (a.damage > 0) a.damage += 2; });
        if (healAmt > 0) {
          lindwurmLord.hp += healAmt;
          this.addLog(`${lindwurmLord.name} devours ${s.name}! (+${healAmt} HP, +2 damage)`);
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: lindwurmLord.index, text: `Fed! +2 dmg`, color: 'var(--red-bright)' });
        } else {
          this.addLog(`${lindwurmLord.name} devours ${s.name}! (+2 damage)`);
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: lindwurmLord.index, text: `Fed! +2 dmg`, color: 'var(--red-bright)' });
        }
        s.hp = 0;
        s.dead = true;
        this.killedEnemies.push(s.id);
        this.addLog(`${s.name} is consumed!`);
      }
    }

    // Leech recombine: if 3+ leeches alive and no leech_mound/lesser exists, merge 3 into lesser mound
    const leechMoundAlive = alive.some(e => e.id === 'leech_mound' || e.id === 'lesser_leech_mound');
    const leeches = alive.filter(e => e.id === 'mire_leech');
    if (!leechMoundAlive && leeches.length >= 3 && !this._leechReformUsed) {
      // Kill 3 leeches
      for (let li = 0; li < 3; li++) {
        leeches[li].hp = 0;
        leeches[li].dead = true;
        this.killedEnemies.push(leeches[li].id);
      }
      // Spawn lesser leech mound
      this._leechReformUsed = true;
      const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
      const lesserDef = ENEMY_DATA['lesser_leech_mound'];
      if (lesserDef && this.enemies.filter(en => !en.dead).length < 6) {
        const scaledHp = Math.round(lesserDef.maxHp * this.getHpScale(diffBonus));
        const blockScale = 1.25;
        const scaledActions = lesserDef.actions.map(a => ({
          ...a,
          damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
          poisonTarget: a.poisonTarget ? a.poisonTarget + diffBonus : undefined,
          blockSelf: a.blockSelf ? Math.round((a.blockSelf + diffBonus) * blockScale) : undefined,
        }));
        const lesser = {
          index: this.enemies.length, ...lesserDef,
          maxHp: scaledHp, hp: scaledHp, actions: scaledActions,
          dead: false, poison: 0, block: 0, justSpawned: true, isBoss: true,
        };
        this.enemies.push(lesser);
        this.addLog('The leeches writhe and merge — a Lesser Leech Mound reforms!');
        if (this.onVisual) this.onVisual('screenShake', {});
        setTimeout(() => { lesser.justSpawned = false; this.update(); }, 500);
      }
    }

    // Ursus Ferox: living cubs grant 4 block each turn
    const ursusAlive = alive.find(e => e.id === 'ursus_ferox');
    if (ursusAlive) {
      const livingCubs = alive.filter(e => e.id === 'bone_gnawer_cub').length;
      if (livingCubs > 0) {
        const cubBlock = livingCubs * 4;
        ursusAlive.block = (ursusAlive.block || 0) + cubBlock;
        this.addLog(`Bone-Gnawer Cubs pile bones — ${ursusAlive.name} gains ${cubBlock} Block!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: ursusAlive.index, text: `+${cubBlock} Block`, color: 'var(--blue-bright)' });
      }
    }

    this.executeEnemySequence(alive, 0);
  }

  executeEnemySequence(enemies, index) {
    if (index >= enemies.length || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
      this.checkPartyDowned();
      if (this.phase !== PHASE.DEFEAT && this.phase !== PHASE.VICTORY) {
        // Thusnelda passive: gains 12 block per living ally at end of enemy turn (before poison)
        const thusnelda = this.enemies.find(e => e.id === 'thusnelda' && !e.dead);
        if (thusnelda) {
          const allyCount = this.enemies.filter(e => !e.dead && e !== thusnelda).length;
          if (allyCount > 0) {
            const blk = allyCount * 12;
            thusnelda.block = (thusnelda.block || 0) + blk;
            this.addLog(`Thusnelda's allies shield her. (+${blk} Block from ${allyCount} allies)`);
          }
        }

        // Poison tick on enemies at end of enemy turn
        this.enemies.forEach(e => {
          if (!e.dead && e.poison > 0) {
            const poisonDmg = e.poison;
            e.hp = Math.max(0, e.hp - poisonDmg);
            const poisoner = this.party.filter(u => !u.downed && u.stats.poisonInflicted > 0)
              .sort((a, b) => b.stats.poisonInflicted - a.stats.poisonInflicted)[0];
            if (poisoner) poisoner.stats.poisonDamageDealt += poisonDmg;
            this.addLog(`${e.name} takes ${poisonDmg} poison damage.`);
            if (this.onVisual) this.onVisual('enemyAttack', { enemyIndex: e.index, type: 'poison' });
            e.poison = Math.max(0, e.poison - 1);
            if (e.hp <= 0) {
              e.dead = true; e.hp = 0; this.killedEnemies.push(e.id); this.totalEnemiesKilled++;
              this.addLog(`${e.name} falls to poison!`);
              const baseHp = ENEMY_DATA[e.id] ? ENEMY_DATA[e.id].maxHp : e.maxHp;
              const diffBonusKill = Math.floor((this.difficulty || 1) / 3);
              let moraleRestore = (baseHp > 10 ? 3 : 2) + diffBonusKill;
              if (e.deathMoraleMultiplier) moraleRestore *= e.deathMoraleMultiplier;
              this.morale = Math.max(0, Math.min(100, this.morale + moraleRestore));
              if (moraleRestore >= 0) {
                this.addLog(`Your men rally! (+${moraleRestore} Morale)`);
              } else {
                this.addLog(`The men recoil in horror. (${moraleRestore} Morale)`);
              }
              if (this.onVisual) this.onVisual('morale', { amount: moraleRestore });
              if (this.partyHasItem('serpents_coil')) {
                this.enemies.forEach(other => {
                  if (!other.dead && other !== e) other.poison = (other.poison || 0) + 2;
                });
                this.addLog("Serpent's Coil spreads venom! (+2 Poison to all enemies)");
              }
              if (this.partyHasItem('corpsebloom')) {
                const cbLv = this.getPartyItemLevel('corpsebloom');
                const cbHeal = 1 * cbLv;
                this.party.forEach(u => {
                  if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + cbHeal);
                });
                this.addLog(`Corpsebloom blooms — all allies heal ${cbHeal} HP!`);
              }
            }
          }
        });
        // Process death effects (grove witch totems, ariovistus, etc.) and check victory
        this.checkEnemyDeaths();
        if (this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
          this.update();
          return;
        }
        this.rollEnemyIntents();
        setTimeout(() => this.startRollPhase(), 400);
      } else {
        this.update();
      }
      return;
    }

    const enemy = enemies[index];
    if (enemy.dead) {
      setTimeout(() => this.executeEnemySequence(enemies, index + 1), 100);
      return;
    }

    // Show enemy portrait before action
    const intentAction = enemy._intent && enemy._intent.action ? enemy._intent.action.name : '';
    const fast = typeof isFastMode === 'function' && isFastMode();
    if (this.onVisual) this.onVisual('enemyCutIn', { enemyName: enemy.name, enemyId: enemy.id, actionName: intentAction });

    // Delay action slightly so portrait is visible
    setTimeout(() => {
      if (enemy.dead || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
        this.executeEnemySequence(enemies, index + 1);
        return;
      }
      this.executeEnemyAction(enemy);

      // Check for second strike (specific boss enrage or wounded frenzy)
      const enrageBosses = ['arminius_champion', 'blood_stag'];
      const needsSecondStrike =
        (enemy.isBoss && enrageBosses.includes(enemy.id) && enemy.hp > 0 && !enemy.dead && enemy.hp <= enemy.maxHp * 0.5) ||
        (!enemy.isBoss && enemy.woundedDoubleAttack && enemy.hp > 0 && !enemy.dead && enemy.hp <= enemy.maxHp * 0.5);

      if (needsSecondStrike) {
        this.update();
        setTimeout(() => {
          if (enemy.dead || this.phase === PHASE.VICTORY || this.phase === PHASE.DEFEAT) {
            this.executeEnemySequence(enemies, index + 1);
            return;
          }
          const msg = enemy.isBoss ? `${enemy.name} is enraged and strikes again!` : `${enemy.name} is wounded and attacks in a frenzy!`;
          this.addLog(msg);
          this.executeEnemySingleAction(enemy);
          this.checkPartyDowned();
          this.update();
          setTimeout(() => this.executeEnemySequence(enemies, index + 1), fast ? 250 : 1500);
        }, fast ? 200 : 1000);
      } else {
        this.checkPartyDowned();
        this.update();
        setTimeout(() => this.executeEnemySequence(enemies, index + 1), fast ? 250 : 1500);
      }
    }, fast ? 80 : 550);
  }

  executeEnemyAction(enemy) {
    this.executeEnemySingleAction(enemy);
  }

  executeEnemySingleAction(enemy) {
    this._lastAttackerName = enemy.name;

    // Pending spawn: boss uses their turn to summon instead of attacking
    if (enemy._pendingSpawn && enemy._pendingSpawn.length > 0) {
      const spawns = enemy._pendingSpawn;
      enemy._pendingSpawn = null;
      for (const s of spawns) {
        if (s.type === 'healingTotem') {
          this.spawnHealingTotem(enemy);
        } else {
          this.spawnBossMinion(s.id);
        }
      }
      enemy._spawnedLastTurn = true;
      this.addLog(`${enemy.name} summons reinforcements!`);
      if (this.onVisual) this.onVisual('enemyAttack', { enemyIndex: enemy.index });
      return;
    }

    // Stunned enemy: skip action
    if (enemy._skipNextAction) {
      enemy._skipNextAction = false;
      this.addLog(`${enemy.name} is stunned and cannot act!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Stunned!', color: 'var(--red-bright)' });
      return;
    }

    // If enemy is in back row and has no usable ranged/aoe/support actions, move to front
    if (enemy.row === 'back' && !enemy.isStructure) {
      const canActFromBack = enemy.actions.some(a =>
        a.ignoreRow || a.aoe || a.spawn || a.blockSelf || a.blockAllEnemies || a.blockFrontRow || a.healAlly ||
        (a.damage === 0 && (a.morale || a.runeBinding))
      );
      if (!canActFromBack) {
        enemy.row = 'front';
        this.addLog(`${enemy.name} charges to the front row!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Advance!', color: 'var(--text-dim)' });
        return;
      }
    }

    // Structures (Wicker Man) don't take actions — their damage is passive via turnDamageAll
    if (enemy.isStructure) {
      this.addLog(`${enemy.name} ${enemy.actions[0].text}.`);
      return;
    }

    // Tick down enemy action cooldowns
    if (!enemy._actionCooldowns) enemy._actionCooldowns = {};

    // Use pre-rolled intent if available, otherwise re-roll
    let action, target;
    if (enemy._intent && enemy._intent.action) {
      action = enemy._intent.action;
      // Validate target is still alive and targetable
      const intendedTarget = this.party[enemy._intent.targetIndex];
      if (intendedTarget && !intendedTarget.downed && !intendedTarget._untargetable) {
        target = intendedTarget;
      } else {
        target = this.pickEnemyTarget(enemy, action);
      }
      // Check taunt override: if someone taunted since intent was rolled
      const taunting = this.party.find(u => !u.downed && u.taunt);
      if (taunting && !action.aoe) target = taunting;
    } else {
      // Fallback: re-roll action and target
      let availableActions = enemy.actions;
      if (enemy.ai === 'defensive') {
        const sameRowAlive = this.enemies.filter(e => !e.dead && e.row === enemy.row && e !== enemy);
        if (sameRowAlive.length > 0) {
          const nonDamage = availableActions.filter(a => !a.damage || a.damage === 0);
          if (nonDamage.length > 0) availableActions = nonDamage;
        }
      }
      if (enemy.phaseShift) {
        const currentPhase = enemy.row === 'back' ? 'ranged' : 'melee';
        const phaseFiltered = availableActions.filter(a => !a.phase || a.phase === currentPhase);
        if (phaseFiltered.length > 0) availableActions = phaseFiltered;
      }
      if (!enemy._actionCooldowns) enemy._actionCooldowns = {};
      const offCooldown = availableActions.filter(a => !a.cooldown || !(enemy._actionCooldowns[a.name] > 0));
      if (offCooldown.length > 0) availableActions = offCooldown;
      const totalChance = availableActions.reduce((s, a) => s + a.chance, 0);
      const roll = Math.random() * totalChance;
      let cumulative = 0;
      action = availableActions[0];
      for (const a of availableActions) {
        cumulative += a.chance;
        if (roll <= cumulative) { action = a; break; }
      }
      target = this.pickEnemyTarget(enemy, action);
    }

    // Set cooldown on used action
    if (action.cooldown) {
      if (!enemy._actionCooldowns) enemy._actionCooldowns = {};
      enemy._actionCooldowns[action.name] = action.cooldown + 1;
    }

    // Clear the used intent
    enemy._intent = null;

    if (!target) return;

    // Smoke Screen: chance to miss entirely
    if (enemy._smokeScreen && Math.random() < enemy._smokeScreen) {
      enemy._smokeScreen = 0;
      this.addLog(`${enemy.name}'s attack misses in the smoke!`);
      if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Miss!', color: 'var(--text-dim)' });
      return;
    }

    if (this.onVisual) {
      this.onVisual('enemyAttack', { enemyIndex: enemy.index });
    }

    if (action.damage > 0 || action.damageFromBlock) {
      // Arcania passive: Intelligence Network — reduce strongest attack by 40% once
      const arcania = this.party.find(u => u.classId === 'arcania' && !u.downed && !u._intNetUsed);
      if (arcania && action.damage > 0) {
        const maxDmg = Math.max(...enemy.actions.map(a => a.damage || 0));
        if (action.damage >= maxDmg && maxDmg > 0) {
          arcania._intNetUsed = true;
          const reduction = Math.floor(action.damage * 0.4);
          action = { ...action, damage: action.damage - reduction };
          this.addLog(`Intelligence Network! ${arcania.name} predicted this — damage reduced by ${reduction}!`);
        }
      }
      let actionDamage = action.damage || 0;
      // Ambush: enemies deal half damage on the surprise round
      if (this._ambushDamageHalved) {
        actionDamage = Math.max(1, Math.floor(actionDamage / 2));
      }
      if (action.damageFromBlock && enemy.block > 0) {
        actionDamage += enemy.block;
        this.addLog(`${enemy.name} channels ${enemy.block} block into the charge!`);
        enemy.block = 0;
      }
      // Blood Stag Charge: double damage vs targets without block
      if (enemy.id === 'blood_stag' && enemy._chargeReady) {
        enemy._chargeReady = false;
        enemy.row = 'front';
        if (!target.block || target.block <= 0) {
          actionDamage *= 2;
          this.addLog(`${enemy.name} CHARGES! Double damage — ${target.name} had no block!`);
          if (this.onVisual) this.onVisual('screenShake', {});
        } else {
          this.addLog(`${enemy.name} charges — ${target.name}'s block absorbs the impact!`);
        }
      }
      // Berserk Rage: bonus damage based on missing HP (up to +50% at 0 HP)
      if (enemy.berserkRage && enemy.maxHp > 0) {
        const missingPct = 1 - (enemy.hp / enemy.maxHp);
        const rageBonus = Math.round(actionDamage * missingPct * 0.5);
        if (rageBonus > 0) {
          actionDamage += rageBonus;
          this.addLog(`${enemy.name}'s rage intensifies! (+${rageBonus} damage)`);
        }
      }
      // Curse: Hunter's Shadow — enemies deal +1 damage
      const curseBonusDmg = this.getActiveCurses().includes('hunters_shadow') ? 1 : 0;
      let dmg = actionDamage + curseBonusDmg;
      // Ballistarius passive: Pinning Fire — pinned enemies deal 15% less
      if (enemy._pinned) {
        const reduction = Math.max(1, Math.floor(dmg * 0.15));
        dmg = Math.max(1, dmg - reduction);
        enemy._pinned = false;
      }
      // Suppress: -40% damage
      if (enemy._suppressed && enemy._suppressed > 0) {
        const suppReduction = Math.max(1, Math.floor(dmg * 0.4));
        dmg = Math.max(1, dmg - suppReduction);
        enemy._suppressed--;
      }
      // Cripple: -30% damage for N actions
      if (enemy._crippled && enemy._crippled > 0) {
        const cripReduction = Math.max(1, Math.floor(dmg * 0.3));
        dmg = Math.max(1, dmg - cripReduction);
        enemy._crippled--;
      }
      // Intercept: Praetorian takes the hit instead
      const interceptor = this.party.find(u => !u.downed && u._intercept && u !== target);
      if (interceptor && dmg > 0) {
        interceptor._intercept = false;
        const halfDmg = Math.max(1, Math.floor(dmg / 2));
        interceptor.hp = Math.max(0, interceptor.hp - halfDmg);
        interceptor.stats.damageTaken += halfDmg;
        enemy.hp = Math.max(0, enemy.hp - halfDmg);
        enemy._skipNextAction = true;
        this.addLog(`${interceptor.name} intercepts! Takes ${halfDmg} damage, reflects ${halfDmg} back. ${enemy.name} is stunned!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: interceptor.index, text: 'Intercept!', color: 'var(--blue-bright)' });
        if (this.onVisual) {
          this.onVisual('unitHit', { unitIndex: interceptor.index, damage: halfDmg });
        }
        dmg = 0;
      }
      // Damage Shield: reduce incoming damage
      if (target._damageShield && dmg > 0) {
        dmg = Math.max(1, Math.round(dmg * target._damageShield));
        target._damageShield = 0;
      }
      // Enemy pierceBlock: ignore target's block entirely
      if (action.pierceBlock && target.block > 0) {
        this.addLog(`The shot pierces through ${target.name}'s block!`);
        // Don't absorb — skip block check below
      }
      // Hunt marked: bonus damage against marked targets
      if (target._huntMarked && target._huntMarked > 0 && dmg > 0) {
        const markBonus = Math.floor(dmg * 0.3);
        dmg += markBonus;
        this.addLog(`Marked target! +${markBonus} bonus damage!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Marked!', color: 'var(--red-bright)' });
      }
      if (target.block > 0 && !action.pierceBlock) {
        const absorbed = Math.min(target.block, dmg);
        // Legionary's Lorica: deal difficulty damage back when hit while having block
        if (absorbed > 0 && this.unitHasItem(target, 'legionary_lorica')) {
          const loricaDmg = this.difficulty || 1;
          enemy.hp = Math.max(0, enemy.hp - loricaDmg);
          this.addLog(`Lorica retaliates for ${loricaDmg} damage!`);
        }
        target.block -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) {
          target.stats.blockAbsorbed += absorbed;
          this.addLog(`${target.name}'s block absorbs ${absorbed} damage.`);
        }
      }
      // Berserker Mushroom: gain +1 damage each time hit (max +4)
      if (dmg > 0 && this.unitHasItem(target, 'berserker_mushroom')) {
        if (!target._mushroomRage) target._mushroomRage = 0;
        if (target._mushroomRage < 5) {
          target._mushroomRage++;
          target.equipDamage++;
          this.addLog(`${target.name}'s rage grows! (+1 damage, ${target._mushroomRage}/5)`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: `Rage ${target._mushroomRage}!`, color: 'var(--red-bright)' });
        }
      }
      // Bearskin Aegis: when hit, gain +1 damage for next attack (max +4)
      if (dmg > 0 && this.unitHasItem(target, 'bearskin_aegis')) {
        if (!target._bearskinRage) target._bearskinRage = 0;
        if (target._bearskinRage < 4) {
          target._bearskinRage++;
          target.buffs.push({ damage: 1, attacksLeft: 1 });
          this.addLog(`Bearskin Aegis — ${target.name} channels pain into fury! (+1 damage)`);
        }
      }
      // Praetorian Lorica: when hit below 30% HP, gain +3 damage for 2 attacks
      if (dmg > 0 && this.unitHasItem(target, 'praetorian_lorica') && target.hp <= target.maxHp * 0.3) {
        target.buffs.push({ damage: 3, attacksLeft: 2 });
        this.addLog(`${target.name}'s Lorica blazes — fighting fury! (+3 damage, 2 attacks)`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Lorica!', color: 'var(--red-bright)' });
      }
      // Wolf Pelt: first hit each combat deals less damage (scales with level)
      if (dmg > 0 && !target._wolfPeltUsed && this.unitHasItem(target, 'wolf_pelt')) {
        target._wolfPeltUsed = true;
        const wpLv = this.getItemLevel(target, 'wolf_pelt');
        const wpReduction = 3 + (wpLv - 1);
        dmg = Math.max(1, dmg - wpReduction);
        this.addLog(`Wolf Pelt absorbs the first blow! (-${wpReduction} damage)`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Pelt!', color: 'var(--gold)' });
      }
      // Centurion's Gorget: reduce incoming damage (scales with level, minimum 1)
      if (dmg > 0 && this.unitHasItem(target, 'centurions_gorget')) {
        const gorgetLv = this.getItemLevel(target, 'centurions_gorget');
        dmg = Math.max(1, dmg - (3 + (gorgetLv - 1)));
      }
      // Damage Shield: reduce incoming damage
      if (target._damageShield && dmg > 0) {
        dmg = Math.max(1, Math.round(dmg * target._damageShield));
        target._damageShield = 0;
      }
      // Heartwood Charm: first time taking damage this combat, gain +3 dice next turn
      if (dmg > 0 && !this._heartwoodTriggered && this.partyHasItem('heartwood_charm')) {
        this._heartwoodTriggered = true;
        this._heartwoodBonusDice = 3;
        this.addLog('Heartwood Charm pulses — bonus dice next turn!');
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: '+3 Dice!', color: 'var(--green-bright)' });
      }
      target.hp = Math.max(0, target.hp - dmg);
      target.stats.damageTaken += dmg;
      if (dmg > 0) target._wasHitThisTurn = true;
      const totalActionDmg = actionDamage + curseBonusDmg;
      this.addLog(`${enemy.name} ${action.text} at ${target.name} for ${totalActionDmg} damage${dmg < totalActionDmg ? ` (${dmg} after block)` : ''}.`);

      if (this.onVisual) {
        this.onVisual('unitHit', { unitIndex: target.index, damage: dmg });
      }

      // Corpse of Arminius: Undying Rage — attacks also drain 5 morale
      if (enemy._undyingRage && dmg > 0) {
        this.morale = Math.max(0, this.morale - 5);
        this.clampMorale();
        this.addLog(`Undying Rage! ${enemy.name}'s attack drains 5 Morale!`);
        if (this.onVisual) this.onVisual('morale', { amount: -5 });
      }

      // Divine Intercession: retribution damage to attacker
      if (target._divineRetribution && dmg >= 0) {
        const retDmg = target._divineRetribution;
        enemy.hp = Math.max(0, enemy.hp - retDmg);
        target._divineRetribution = 0;
        this.addLog(`Vesta's flame strikes back — ${enemy.name} takes ${retDmg} retribution damage!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Retribution!', color: '#ff6600' });
      }

      // Counter Stance: retaliate damage
      if (target._counterStance && dmg > 0) {
        const counterDmg = dmg + 2;
        enemy.hp = Math.max(0, enemy.hp - counterDmg);
        target._counterStance = 0;
        this.addLog(`${target.name} retaliates for ${counterDmg} damage! (${dmg}+2)`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Counter!', color: 'var(--red-bright)' });
      }

      // Overwatch: check all allies for overwatch
      this.party.forEach(u => {
        if (!u.downed && u._overwatch && u._overwatch > 0) {
          const owDmg = u._overwatch;
          enemy.hp = Math.max(0, enemy.hp - owDmg);
          u._overwatch = 0;
          this.addLog(`${u.name}'s overwatch fires! ${enemy.name} takes ${owDmg} damage.`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Overwatch!', color: 'var(--gold)' });
        }
      });

      // Thorn Mantle: when hit, deal damage back to attacker (scales with level)
      if (dmg > 0 && this.unitHasItem(target, 'thorn_mantle')) {
        const tmLv = this.getItemLevel(target, 'thorn_mantle');
        const thornDmg = 2 * tmLv;
        enemy.hp = Math.max(0, enemy.hp - thornDmg);
        this.addLog(`Thorn Mantle deals ${thornDmg} damage back!`);
      }

      // Snare Trap: if this enemy has a trap and attacked, trigger it
      if (enemy._snareTrap && dmg > 0) {
        const trapDmg = enemy._snareTrap;
        enemy.hp = Math.max(0, enemy.hp - trapDmg);
        enemy._skipNextAction = true;
        enemy._snareTrap = 0;
        this.addLog(`The trap springs! ${enemy.name} takes ${trapDmg} damage and is stunned!`);
        if (this.onVisual) this.onVisual('statusText', { enemyIndex: enemy.index, text: 'Trapped!', color: 'var(--gold)' });
      }
    }

    // Enemy poison on target
    if (action.poisonTarget && target) {
      target.poison = (target.poison || 0) + action.poisonTarget;
      this.addLog(`${target.name} is poisoned! (+${action.poisonTarget} Poison)`);
      if (target.index !== undefined && this.onVisual) this.onVisual('unitPoison', { unitIndex: target.index, amount: action.poisonTarget });
    }

    // Weaken target: reduce target's equipDamage for the rest of combat
    if (action.weakenTarget && target) {
      target.equipDamage = (target.equipDamage || 0) - action.weakenTarget;
      this.addLog(`${enemy.name} ${action.text}! ${target.name}'s damage reduced by ${action.weakenTarget}.`);
      if (target.index !== undefined && this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: `-${action.weakenTarget} Dmg`, color: '#aa66aa' });
    }

    if (action.morale) {
      let moraleDelta = action.morale;
      // Deafened: morale attacks have no effect
      if (enemy._deafened && enemy._deafened > 0 && moraleDelta < 0) {
        enemy._deafened--;
        this.addLog(`${enemy.name} is deafened — morale attack has no effect!`);
        moraleDelta = 0;
      }
      // Cornicen passive: Demoralizing Horn — enemy morale attacks deal 3 less morale damage
      if (moraleDelta < 0 && this.party.some(u => !u.downed && u.classId === 'cornicen')) {
        moraleDelta = Math.min(0, moraleDelta + 3);
      }
      if (moraleDelta !== 0) {
        this.morale = Math.max(0, Math.min(100, this.morale + moraleDelta));
        this.clampMorale();
        this.addLog(`${enemy.name} ${action.text}! Morale ${moraleDelta > 0 ? '+' : ''}${moraleDelta}.`);
        if (this.onVisual) {
          this.onVisual('morale', { amount: moraleDelta });
        }
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

    // Multi-target: hit N random targets (not AoE, distinct targets)
    if (action.multiTarget && action.damage > 0 && target) {
      const others = this.party.filter(u => !u.downed && u !== target);
      const extraTargets = [];
      for (let i = 1; i < action.multiTarget && others.length > 0; i++) {
        const pick = others.splice(Math.floor(Math.random() * others.length), 1)[0];
        extraTargets.push(pick);
      }
      extraTargets.forEach(u => {
        let mtDmg = action.damage;
        if (u.block > 0) {
          const absorbed = Math.min(u.block, mtDmg);
          u.stats.blockAbsorbed += absorbed;
          u.block -= absorbed;
          mtDmg -= absorbed;
        }
        u.hp = Math.max(0, u.hp - mtDmg);
        u.stats.damageTaken += mtDmg;
        u._wasHitThisTurn = true;
        if (this.onVisual) this.onVisual('unitHit', { unitIndex: u.index, damage: mtDmg });
      });
      if (extraTargets.length > 0) {
        this.addLog(`${enemy.name} also hits ${extraTargets.map(u => u.name).join(' and ')}!`);
      }
    }

    // Boar Charge: move to front row and stun the target (ambush: max 1 stun)
    if (action.boarCharge && target) {
      if (enemy.row === 'back') {
        enemy.row = 'front';
        this.addLog(`${enemy.name} charges from the back line!`);
      }
      if (this._ambushStunCount === undefined || this._ambushStunCount < 1) {
        target._stunNextTurn = true;
        if (this._ambushStunCount !== undefined) this._ambushStunCount++;
        this.addLog(`${target.name} is stunned by the charge!`);
        if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Stunned!', color: 'var(--red-bright)' });
      }
    }

    // Enemy mark target: mark a player unit for bonus damage
    if (action.markTarget && target && !target.downed) {
      target._huntMarked = 2;
      this.addLog(`${target.name} is marked for death!`);
      if (this.onVisual) this.onVisual('statusText', { unitIndex: target.index, text: 'Marked!', color: 'var(--red-bright)' });
    }

    // Shieldbearer: grant block to all other enemies
    if (action.blockAllEnemies) {
      this.enemies.forEach(e => {
        if (!e.dead && e !== enemy) {
          e.block = (e.block || 0) + action.blockAllEnemies;
          if (this.onVisual) this.onVisual('enemyBlock', { enemyIndex: e.index, amount: action.blockAllEnemies });
        }
      });
      this.addLog(`${enemy.name} ${action.text}. All enemies gain ${action.blockAllEnemies} Block.`);
    }

    // Guardian: grant block to front-row allies only
    if (action.blockFrontRow) {
      this.enemies.forEach(e => {
        if (!e.dead && e.row === 'front' && e !== enemy) {
          e.block = (e.block || 0) + action.blockFrontRow;
          if (this.onVisual) this.onVisual('enemyBlock', { enemyIndex: e.index, amount: action.blockFrontRow });
        }
      });
      this.addLog(`${enemy.name} ${action.text}. Front-row enemies gain ${action.blockFrontRow} Block.`);
    }

    // Guardian: grant block to self
    if (action.blockSelf) {
      enemy.block = (enemy.block || 0) + action.blockSelf;
      this.addLog(`${enemy.name} ${action.text}. Gains ${action.blockSelf} Block.`);
      if (this.onVisual) this.onVisual('enemyBlock', { enemyIndex: enemy.index, amount: action.blockSelf });
    }

    // Heal ally: heal the most wounded non-dead ally
    if (action.healAlly) {
      const wounded = this.enemies.filter(e => !e.dead && e !== enemy && e.hp < e.maxHp)
        .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      if (wounded.length > 0) {
        const ally = wounded[0];
        const healAmt = Math.min(action.healAlly, ally.maxHp - ally.hp);
        ally.hp += healAmt;
        this.addLog(`${enemy.name} ${action.text}. ${ally.name} heals ${healAmt} HP.`);
      }
      if (action.selfDamage) {
        enemy.hp = Math.max(1, enemy.hp - action.selfDamage);
        this.addLog(`${enemy.name} sacrifices ${action.selfDamage} HP.`);
      }
    }

    // Spawn action: spawn another enemy
    if (action.spawn) {
      enemy._spawnedLastTurn = true;
      // Curse: Mother's Brood — enemies that can spawn always spawn on first opportunity
      const mothersBrood = this.getActiveCurses().includes('mothers_brood');
      const alreadySpawned = mothersBrood ? false : enemy._hasSpawned;
      const totalEnemies = this.enemies.filter(e => !e.dead).length;
      if (!alreadySpawned && totalEnemies < 5) {
        enemy._hasSpawned = true;
        const data = ENEMY_DATA[action.spawn];
        if (data) {
          const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
          const scaledMaxHp = Math.round(data.maxHp * this.getHpScale(diffBonus));
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

    // Fog Weaver: Hex — destroy a random die next turn
    if (enemy.id === 'fog_weaver' && action.name === 'Hex') {
      enemy._hexPending = true;
      this.addLog(`${enemy.name} curses your dice — one will crumble next turn!`);
    }

    // Runecarver: Rune of Binding — lower all dice by 1 next turn
    if (action.runeBinding) {
      enemy._runeBindingPending = true;
      this.addLog(`${enemy.name} carves a binding rune — your dice will weaken next turn!`);
    }

    // Blood Stag: Retreat — move to back row and regenerate
    if (enemy.id === 'blood_stag' && action.name === 'Retreat') {
      if (enemy.row !== 'back') {
        enemy.row = 'back';
        const regen = Math.min(6, enemy.maxHp - enemy.hp);
        enemy.hp += regen;
        this.addLog(`${enemy.name} leaps to the treeline and heals ${regen} HP!`);
      } else {
        // Already in back, charge to front instead
        enemy.row = 'front';
        this.addLog(`${enemy.name} charges from the treeline!`);
      }
    }
  }

  // Pre-roll enemy intents for display during player turn
  rollEnemyIntents() {
    this.enemies.forEach(e => {
      if (e.dead || e.isStructure) { e._intent = null; return; }
      if (e._skipNextAction) { e._intent = { type: 'stunned' }; return; }

      const alive = this.party.filter(u => !u.downed);
      if (alive.length === 0) { e._intent = null; return; }

      // Pick most likely action (filter by phase, cooldown, defensive AI)
      let availableActions = e.actions;
      if (e.ai === 'defensive') {
        const sameRowAlive = this.enemies.filter(other => !other.dead && other.row === e.row && other !== e);
        if (sameRowAlive.length > 0) {
          const nonDamage = availableActions.filter(a => !a.damage || a.damage === 0);
          if (nonDamage.length > 0) availableActions = nonDamage;
        }
      }
      if (e.phaseShift) {
        const phase = e.row === 'back' ? 'ranged' : 'melee';
        const filtered = availableActions.filter(a => !a.phase || a.phase === phase);
        if (filtered.length > 0) availableActions = filtered;
      }
      if (!e._actionCooldowns) e._actionCooldowns = {};
      const offCD = availableActions.filter(a => !a.cooldown || !(e._actionCooldowns[a.name] > 0));
      if (offCD.length > 0) availableActions = offCD;

      // Prevent spawn actions two turns in a row
      if (e._spawnedLastTurn) {
        const nonSpawn = availableActions.filter(a => !a.spawn);
        if (nonSpawn.length > 0) availableActions = nonSpawn;
      }

      // Silent Huntsman AI: prefer Mark Prey when no target is marked, Marked Shot when one is
      if (e.id === 'silent_huntsman') {
        const hasMarked = alive.some(u => u._huntMarked && u._huntMarked > 0);
        if (hasMarked) {
          const markedShot = availableActions.find(a => a.name === 'Marked Shot');
          if (markedShot) availableActions = [markedShot];
        } else {
          const markPrey = availableActions.find(a => a.name === 'Mark Prey');
          if (markPrey && Math.random() < 0.6) availableActions = [markPrey];
        }
      }

      // Weighted random pick
      const totalChance = availableActions.reduce((s, a) => s + a.chance, 0);
      const roll = Math.random() * totalChance;
      let cum = 0;
      let action = availableActions[0];
      for (const a of availableActions) { cum += a.chance; if (roll <= cum) { action = a; break; } }

      // Pick target
      const taunting = alive.find(u => u.taunt);
      let target;
      if (taunting) {
        target = taunting;
      } else if (e.id === 'silent_huntsman' && action.name === 'Marked Shot') {
        // Prefer the marked target
        const markedUnit = alive.find(u => u._huntMarked && u._huntMarked > 0);
        target = markedUnit || alive[Math.floor(Math.random() * alive.length)];
      } else if (e.ai === 'bully') {
        target = alive.reduce((max, u) => u.hp > max.hp ? u : max, alive[0]);
      } else {
        target = alive[Math.floor(Math.random() * alive.length)];
      }

      const isAoe = action.aoe && action.damage > 0;
      e._intent = {
        action: action,
        targetIndex: target.index,
        targetName: target.name,
        isAoe: isAoe,
        isTaunted: !!taunting,
        isSniper: e.ai === 'sniper',
      };
    });
  }

  pickEnemyTarget(enemy, action) {
    let alive = this.party.filter(u => !u.downed);
    // Dead Drop: untargetable units can't be targeted (fall back to all alive if everyone is untargetable)
    const targetable = alive.filter(u => !u._untargetable);
    if (targetable.length > 0) alive = targetable;
    if (alive.length === 0) return null;
    const taunting = alive.find(u => u.taunt);
    if (taunting) return taunting;
    // Slingers: target highest HP
    if (enemy.ai === 'bully') {
      return alive.reduce((max, u) => u.hp > max.hp ? u : max, alive[0]);
    }

    // Ambush spread: avoid targeting the same unit if others haven't been hit
    if (this._ambushTargeted && alive.length > 1) {
      const untargeted = alive.filter(u => !this._ambushTargeted.has(u.index));
      if (untargeted.length > 0) {
        const target = untargeted[Math.floor(Math.random() * untargeted.length)];
        this._ambushTargeted.add(target.index);
        return target;
      }
    }
    if (this._ambushTargeted) {
      const target = alive[Math.floor(Math.random() * alive.length)];
      this._ambushTargeted.add(target.index);
      return target;
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
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Unyielding!', color: 'var(--gold)' });
          return;
        }
        // Contingency Plan: prevent downing this turn
        if (u._contingency) {
          u.hp = 1;
          this.addLog(`Contingency Plan saves ${u.name}!`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Contingency!', color: 'var(--gold)' });
          return;
        }
        // Aquila Cuirass: survive lethal, deal 8 damage to all enemies (once per combat)
        if (!this._aquilaCuirassUsed && this.unitHasItem(u, 'aquila_cuirass')) {
          this._aquilaCuirassUsed = true;
          u.hp = 1;
          this.enemies.forEach(e => {
            if (!e.dead) { e.hp = Math.max(0, e.hp - 8); }
          });
          this.addLog(`The Aquila screams! ${u.name} refuses to fall — 8 damage to all enemies!`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: 'Aquila!', color: 'var(--gold)' });
          if (this.onVisual) this.onVisual('screenShake', {});
          return;
        }
        // Lupa's Fang: first downing prevented (once per combat)
        if (!this._lupaFangUsed && this.partyHasItem('lupas_fang')) {
          this._lupaFangUsed = true;
          u.hp = 1;
          this.addLog(`Lupa's Fang glows — ${u.name} refuses to fall!`);
          if (this.onVisual) this.onVisual('statusText', { unitIndex: u.index, text: "Lupa's Fang!", color: '#cc44ff' });
          return;
        }
        u.downed = true;
        u.hp = 0;
        u._killedBy = this._lastAttackerName || 'Poison';
        this.addLog(`${u.name} is downed!`);
        this.morale = Math.max(0, this.morale - 10);
        this.clampMorale();
        if (this.onVisual) this.onVisual('morale', { amount: -10 });
        // Wolfsmother Pelt: when an ally is downed, wielder gains +4 damage for 3 attacks
        this.party.forEach(ally => {
          if (!ally.downed && ally !== u && this.unitHasItem(ally, 'wolfsmother_pelt')) {
            ally.buffs.push({ damage: 4, attacksLeft: 3 });
            this.addLog(`${ally.name}'s Wolfsmother Pelt blazes — vengeance! (+4 damage, 3 attacks)`);
          }
        });
      }
    });
    if (this.party.every(u => u.downed)) {
      this.phase = PHASE.DEFEAT;
      this.addLog('The last cohort falls...');
    }
  }

  // --- Skills / Leveling (party-wide XP) ---
  initSkills(unit) {
    const starters = unit.allSkills.filter(s => s.starter);
    // Always include the "any" cost skill first (base attack), then pick 1 more
    const anySkill = starters.find(s => s.cost && s.cost.type === 'any');
    const others = starters.filter(s => s !== anySkill).sort(() => Math.random() - 0.5);
    const picked = anySkill ? [anySkill, ...others.slice(0, 1)] : starters.slice(0, 2);
    unit.skills = picked.map(s => ({ ...s }));
  }

  getUnlearnedSkills(unit) {
    if (unit.skills.length >= 5) return []; // Max 5 skills per unit
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

  // Add encounter XP — grants a skill pick every 3 encounters
  addEncounterXP(isBoss) {
    const hasAnyUse = this.party.some(u => !u.downed);
    if (!hasAnyUse) return false;

    // Bosses always grant a pick immediately
    if (isBoss) {
      this.pendingSkillPicks++;
      return true;
    }

    this.encounterXP++;
    if (this.encounterXP >= 3) {
      this.encounterXP = 0;
      this.pendingSkillPicks++;
      return true;
    }
    return false;
  }

  // --- Equipment helpers ---
  unitHasItem(unit, itemId) {
    // Use cache if available
    if (unit._itemCache && unit._itemCache[itemId] !== undefined) return unit._itemCache[itemId];
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const equipped of unit.equipment[slot]) {
        if (!equipped) continue;
        if (equipped === itemId) {
          if (!unit._itemCache) unit._itemCache = {};
          unit._itemCache[itemId] = true;
          return true;
        }
        const item = ITEM_DATA[equipped];
        if (item && item.baseId === itemId) {
          if (!unit._itemCache) unit._itemCache = {};
          unit._itemCache[itemId] = true;
          return true;
        }
      }
    }
    if (!unit._itemCache) unit._itemCache = {};
    unit._itemCache[itemId] = false;
    return false;
  }

  partyHasItem(itemId) {
    return this.party.some(u => !u.downed && this.unitHasItem(u, itemId));
  }

  getItemLevel(unit, itemId) {
    for (const slot of ['weapon', 'armor', 'trinket']) {
      for (const equipped of unit.equipment[slot]) {
        if (!equipped) continue;
        if (equipped === itemId) return 1;
        const item = ITEM_DATA[equipped];
        if (item && item.baseId === itemId) return item.level || 1;
      }
    }
    return 1;
  }

  getPartyItemLevel(itemId) {
    let maxLevel = 1;
    this.party.forEach(u => {
      if (!u.downed) {
        const lv = this.getItemLevel(u, itemId);
        if (lv > maxLevel) maxLevel = lv;
      }
    });
    return maxLevel;
  }

  computeEquipmentStats(unit) {
    unit._itemCache = {}; // invalidate item lookup cache
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
    // Persistent level-up bonuses
    if (unit.bonusDamage) unit.equipDamage += unit.bonusDamage;
    if (unit.bonusBlock) unit.equipBlock += unit.bonusBlock;
    if (unit.bonusHeal) unit.equipHeal += unit.bonusHeal;
    if (unit.bonusPoison) unit.equipPoison += unit.bonusPoison;
    // Wulfswestr passive: Forest-Born — +1 damage per march
    if (unit.classId === 'wulfswestr') {
      unit.equipDamage += (this.difficulty || 1);
    }
  }

  // Clamp morale — Vestalis passive prevents dropping below 25
  clampMorale() {
    const hasVestalis = this.party.some(u => u.classId === 'vestalis' && !u.downed);
    const floor = hasVestalis ? 25 : 0;
    this.morale = Math.max(floor, Math.min(100, this.morale));
  }

  getExtraDiceCount() {
    let extra = 0;
    this.party.forEach(u => {
      if (!u.downed) {
        extra += (u.equipExtraDice || 0);
        // Signifer passive: +1 extra die while morale is 25+
        if (u.classId === 'signifer' && this.morale >= 60) extra += 1;
      }
    });
    return extra;
  }

  // Cornicen passive / Fate's Coin: can reroll 1 die per turn (never same value)
  canRerollDie() {
    if (!this.dicePool.rerollUsed && this.party.some(u => u.classId === 'cornicen' && !u.downed)) return true;
    if (!this.dicePool.itemRerollUsed && this.partyHasItem('fates_coin')) return true;
    return false;
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

    // Use class passive first, then item
    const hasCornicen = !this.dicePool.rerollUsed && this.party.some(u => u.classId === 'cornicen' && !u.downed);
    if (hasCornicen) {
      this.dicePool.rerollUsed = true;
      this.addLog(`Cornicen rerolls die: ${oldVal} → ${newVal}`);
    } else {
      this.dicePool.itemRerollUsed = true;
      this.addLog(`Fate's Coin rerolls die: ${oldVal} → ${newVal}`);
    }
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
      const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3 };
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
    const hasDefiance = this.getActiveBoons().includes('arminius_defiance');
    const revivePct = hasDefiance ? 0.7 : 0.5;
    this.party.forEach(u => {
      if (u.downed) {
        u.downed = false;
        u.hp = Math.floor(u.maxHp * revivePct);
        this.addLog(`${u.name} recovers at ${u.hp} HP.`);
      }
      u.block = 0;
      u.poison = 0;
      u.buffs = [];
    });
  }

  // --- Boss Phase Mechanics ---
  processBossPhases() {
    for (const boss of this.enemies) {
      if (!boss.isBoss || boss.dead) continue;

      // Arminius's Champion: queues 2 raiders at 50% HP
      if (boss.id === 'arminius_champion' && !boss._phase50 && boss.hp <= boss.maxHp * 0.5) {
        boss._phase50 = true;
        boss.row = 'front';
        boss._pendingSpawn = [{ id: 'cheruscan_raider' }, { id: 'cheruscan_raider' }];
        this.addLog(`${boss.name} roars — reinforcements are coming!`);
      }

      // Grove Witch: queues healing totem at 66% and 33%, moves to back row
      if (boss.id === 'grove_witch') {
        if (!boss._phase66 && boss.hp <= boss.maxHp * 0.66) {
          boss._phase66 = true;
          boss._pendingSpawn = [{ type: 'healingTotem' }];
          if (boss.row !== 'back') { boss.row = 'back'; this.addLog(`${boss.name} retreats to summon!`); }
          this.addLog(`${boss.name} begins channeling — a totem grows!`);
        }
        if (!boss._phase33 && boss.hp <= boss.maxHp * 0.33) {
          boss._phase33 = true;
          boss._pendingSpawn = [{ type: 'healingTotem' }];
          if (boss.row !== 'back') { boss.row = 'back'; this.addLog(`${boss.name} retreats to summon!`); }
          this.addLog(`${boss.name} begins channeling — another totem sprouts!`);
        }
      }

      // Mire Mother: queues brood at 70% and 40% HP
      if (boss.id === 'mire_mother') {
        if (!boss._phase70 && boss.hp <= boss.maxHp * 0.7) {
          boss._phase70 = true;
          boss._pendingSpawn = [{ id: 'boar_youngling' }];
          this.addLog(`${boss.name} bellows! Her brood is coming!`);
        }
        if (!boss._phase40 && boss.hp <= boss.maxHp * 0.4) {
          boss._phase40 = true;
          boss._pendingSpawn = [{ id: 'war_boar' }];
          this.addLog(`${boss.name} screams in fury! War boars crash through the undergrowth!`);
        }
      }

      // Serpent Shaman: queues serpents at 60% and 30%
      if (boss.id === 'serpent_shaman') {
        if (!boss._phase60 && boss.hp <= boss.maxHp * 0.6) {
          boss._phase60 = true;
          boss._pendingSpawn = [{ id: 'serpent_shade' }, { id: 'fen_viper' }];
          this.addLog(`${boss.name} hisses — spectral serpents slither from the shadows!`);
        }
        if (!boss._phase30 && boss.hp <= boss.maxHp * 0.3) {
          boss._phase30 = true;
          boss._pendingSpawn = [{ id: 'serpent_shade' }, { id: 'serpent_shade' }];
          // Apply 1 poison to all party members
          this.party.forEach(u => { if (!u.downed) u.poison = (u.poison || 0) + 1; });
          this.addLog(`${boss.name}'s eyes blaze! Venom fills the air — all soldiers take 1 Poison!`);
        }
      }

      // Fog Weaver: queues illusions at 60%, buffs at 30%
      if (boss.id === 'fog_weaver') {
        if (!boss._phase60 && boss.hp <= boss.maxHp * 0.6) {
          boss._phase60 = true;
          boss._pendingSpawn = [{ id: 'fog_illusion' }, { id: 'fog_illusion' }];
          this.addLog(`The fog thickens! Shapes multiply in the mist!`);
        }
        if (!boss._phase30 && boss.hp <= boss.maxHp * 0.3) {
          boss._phase30 = true;
          // Give all illusions +5 HP immediately
          this.enemies.forEach(e => {
            if (!e.dead && e.id === 'fog_illusion') {
              e.hp = Math.min(e.maxHp + 5, e.hp + 5);
              e.maxHp += 5;
            }
          });
          boss._pendingSpawn = [{ id: 'fog_illusion' }];
          this.addLog(`${boss.name} shrieks! The fog becomes impenetrable!`);
        }
      }

      // Blood Stag: alternates charge/retreat phases
      if (boss.id === 'blood_stag') {
        if (!boss._phase60 && boss.hp <= boss.maxHp * 0.6) {
          boss._phase60 = true;
          boss.row = 'back';
          const regen = Math.min(8, boss.maxHp - boss.hp);
          boss.hp += regen;
          boss._pendingSpawn = [{ id: 'marsh_wolf' }];
          this.addLog(`${boss.name} leaps back and regenerates ${regen} HP!`);
        }
        if (!boss._phase30 && boss.hp <= boss.maxHp * 0.3) {
          boss._phase30 = true;
          boss.row = 'front';
          // Apply bleed (poison) to all party
          this.party.forEach(u => { if (!u.downed) u.poison = (u.poison || 0) + 3; });
          this.addLog(`${boss.name} charges with berserk fury! Antlers rake everyone — 3 Poison to all!`);
          if (this.onVisual) this.onVisual('screenShake', {});
        }
      }

      // Thusnelda: summons a raider at 50%, a wolf at 30%, buffs allies at 30%
      if (boss.id === 'thusnelda') {
        if (!boss._phase50 && boss.hp <= boss.maxHp * 0.5) {
          boss._phase50 = true;
          boss._pendingSpawn = [{ id: 'cheruscan_raider' }];
          this.addLog(`${boss.name} calls for aid! A warrior answers!`);
        }
        if (!boss._phase30 && boss.hp <= boss.maxHp * 0.3) {
          boss._phase30 = true;
          boss._pendingSpawn = [{ id: 'marsh_wolf' }];
          // Retreat Call: all surviving allies heal 50% HP and gain +2 damage
          this.enemies.forEach(e => {
            if (!e.dead && e !== boss) {
              const healAmt = Math.floor(e.maxHp * 0.5);
              e.hp = Math.min(e.maxHp, e.hp + healAmt);
              e.actions.forEach(a => { if (a.damage > 0) a.damage += 2; });
            }
          });
          this.addLog(`${boss.name} lets out a piercing whistle — RETREAT CALL! All allies rally, healing and fighting harder!`);
          if (this.onVisual) this.onVisual('screenShake', {});
        }
      }

      // Corpse of Arminius: at 50% all allies gain +3 damage, at 25% gains Undying Rage (morale drain)
      if (boss.id === 'corpse_of_arminius') {
        if (!boss._phase50 && boss.hp <= boss.maxHp * 0.5) {
          boss._phase50 = true;
          this.enemies.forEach(e => {
            if (!e.dead && e !== boss) {
              e.actions.forEach(a => { if (a.damage > 0) a.damage += 3; });
            }
          });
          this.addLog(`${boss.name}'s eyes blaze! His warriors fight with renewed fury! (+3 damage to all allies)`);
          if (this.onVisual) this.onVisual('screenShake', {});
        }
        if (!boss._phase25 && boss.hp <= boss.maxHp * 0.25) {
          boss._phase25 = true;
          boss._undyingRage = true;
          this.addLog(`${boss.name} enters Undying Rage! His attacks drain your men's will!`);
          if (this.onVisual) this.onVisual('screenShake', {});
        }
      }

      // Corpse of Varus: at 40% moves to front row, gains Final Order melee attack
      if (boss.id === 'corpse_of_varus') {
        if (!boss._phase40 && boss.hp <= boss.maxHp * 0.4) {
          boss._phase40 = true;
          boss.row = 'front';
          // Replace Commander's Lash with Final Order
          const lashIdx = boss.actions.findIndex(a => a.name === "Commander's Lash");
          if (lashIdx >= 0) {
            boss.actions[lashIdx] = { name: "Final Order", damage: 15, chance: 0.3, text: "draws a ghostly gladius and strikes with a general's fury" };
          }
          this.addLog(`${boss.name} strides forward! "If Rome must die, I will lead the charge!" He draws a spectral gladius!`);
          if (this.onVisual) this.onVisual('screenShake', {});
        }
      }

      // Ursus Ferox: Last Stand below 25% — double attacks, no more block regen
      if (boss.id === 'ursus_ferox') {
        if (!boss._lastStand && boss.hp <= boss.maxHp * 0.25) {
          boss._lastStand = true;
          boss.woundedDoubleAttack = true;
          // Remove Hunker action
          boss.actions = boss.actions.filter(a => a.name !== 'Hunker');
          // Boost damage
          boss.actions.forEach(a => { if (a.damage > 0) a.damage += 4; });
          this.addLog(`${boss.name} drops to all fours — LAST STAND! It attacks with desperate fury!`);
          if (this.onVisual) this.onVisual('screenShake', {});
          if (this.onVisual) this.onVisual('statusText', { enemyIndex: boss.index, text: 'LAST STAND!', color: 'var(--red-bright)' });
        }
      }
    }
  }

  spawnBossMinion(enemyId) {
    const data = ENEMY_DATA[enemyId];
    if (!data) return;
    if (this.enemies.filter(e => !e.dead).length >= 6) return;
    const diffBonus = Math.max(0, (this.difficulty || 1) - 1);
    const scaledMaxHp = Math.round(data.maxHp * this.getHpScale(diffBonus));
    const blockScale = 1.25;
    const scaledActions = data.actions.map(a => ({
      ...a,
      damage: a.damage > 0 ? Math.round(a.damage * (1 + diffBonus * 0.35)) : 0,
      poisonTarget: a.poisonTarget ? a.poisonTarget + diffBonus : undefined,
      blockAllEnemies: a.blockAllEnemies ? Math.round((a.blockAllEnemies + diffBonus) * blockScale) : undefined,
      blockFrontRow: a.blockFrontRow ? Math.round((a.blockFrontRow + diffBonus) * blockScale) : undefined,
      blockSelf: a.blockSelf ? Math.round((a.blockSelf + diffBonus) * blockScale) : undefined,
      healSelf: a.healSelf ? Math.round(a.healSelf * (1 + diffBonus * 0.25)) : undefined,
      healAlly: a.healAlly ? Math.round(a.healAlly * (1 + diffBonus * 0.25)) : undefined,
      healBoss: a.healBoss ? Math.round(a.healBoss * (1 + diffBonus * 0.25)) : undefined,
    }));
    const enemy = {
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
    // Thusnelda's Torc: summoned enemies start with 3 less HP
    if (this.partyHasItem('thusneldas_torc')) {
      const reduction = Math.min(3, enemy.hp - 1);
      enemy.hp -= reduction;
      enemy.maxHp -= reduction;
    }
    this.enemies.push(enemy);
    this.addLog(`${data.name} joins the fight!`);
    setTimeout(() => { enemy.justSpawned = false; this.update(); }, 500);
  }

  spawnHealingTotem(boss) {
    if (this.enemies.filter(e => !e.dead).length >= 6) return;
    const totem = {
      index: this.enemies.length,
      id: 'healing_totem',
      name: 'Healing Totem',
      maxHp: 12,
      hp: 12,
      row: 'front',
      damage: [0, 0],
      speed: 0,
      xpValue: 3,
      ai: 'passive',
      isStructure: true,
      healBoss: 7 + (Math.max(0, (this.difficulty || 1) - 1) * 2),
      healBossId: boss.id,
      dead: false,
      poison: 0,
      block: 0,
      justSpawned: true,
      description: `A living totem of twisted roots. Heals the Grove Witch for ${7 + (Math.max(0, (this.difficulty || 1) - 1) * 2)} HP each turn. Destroy it to stop the healing.`,
      actions: [{ name: 'Pulsing Roots', damage: 0, chance: 1.0, text: `pulses with green energy — heals the Witch for ${7 + (Math.max(0, (this.difficulty || 1) - 1) * 2)} HP` }],
    };
    this.enemies.push(totem);
    // Grove Witch gains block when summoning a totem (3 x difficulty)
    const totemBlock = 3 * (this.difficulty || 1);
    boss.block = (boss.block || 0) + totemBlock;
    this.addLog(`A Healing Totem sprouts from the ground! ${boss.name} gains ${totemBlock} Block.`);
    setTimeout(() => { totem.justSpawned = false; this.update(); }, 500);
  }

  // Check if current encounter has a boss
  hasBossEnemy() {
    return this.enemies.some(e => e.isBoss);
  }

  // --- Curse helpers ---
  // Trigger on-heal item effects (Crown of Thorns, etc.)
  triggerOnHealEffects(healedUnit, amount) {
    if (!healedUnit || amount <= 0 || healedUnit.downed) return;
    if (this.unitHasItem(healedUnit, 'crown_of_thorns')) {
      const cotLv = this.getItemLevel(healedUnit, 'crown_of_thorns');
      const cotDmg = 2 * cotLv;
      this.enemies.forEach(e => { if (!e.dead) e.hp = Math.max(0, e.hp - cotDmg); });
      this.addLog(`Crown of Thorns — ${cotDmg} damage to all enemies!`);
    }
  }

  // HP scaling: 0.65 per difficulty up to D6, 0.55 per difficulty at D7+
  getHpScale(diffBonus) {
    if (diffBonus <= 5) return 1 + diffBonus * 0.65;
    return 1 + 5 * 0.65 + (diffBonus - 5) * 0.55;
  }

  getActiveCurses() {
    return (window.game && window.game.activeCurses) ? window.game.activeCurses : [];
  }

  getActiveBoons() {
    return (window.game && window.game.activeBoons) ? window.game.activeBoons : [];
  }

  update() {
    if (this.onUpdate) this.onUpdate();
  }
}
