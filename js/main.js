// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

const RENOWN_STORAGE_KEY = 'lastCohort_renown';
const SETTINGS_STORAGE_KEY = 'lastCohort_settings';
const STATS_STORAGE_KEY = 'lastCohort_stats';
const ACHIEVEMENTS_STORAGE_KEY = 'lastCohort_achievements';

const MUSIC_MENU = 'assets/music.mp3';
const MUSIC_GAMEPLAY = [
  'assets/Teutoburg Shadows.mp3',
  'assets/Forgotten Paths.mp3',
  'assets/Forest of Broken Eagles.mp3',
  'assets/Lost in the Muck.mp3',
  'assets/Legion in the Leaves.mp3',
  'assets/Frontier of the Unquiet Crown.mp3',
  'assets/Teutoburgs Black Earth.mp3',
];
const MUSIC_BOSS = 'assets/Shadow of Arminius.mp3';

// --- Curse Definitions ---
const CURSE_DEFS = [
  { id: 'champions_mark', name: "Champion's Mark", achievement: 'boss_arminius_champion_x3', description: "Bosses have +20% HP." },
  { id: 'witchs_gaze', name: "Witch's Gaze", achievement: 'boss_grove_witch_x3', description: "Morale decay +2 per turn." },
  { id: 'hunters_shadow', name: "Hunter's Shadow", achievement: 'boss_silent_huntsman_x3', description: "Enemies deal +1 damage." },
  { id: 'mothers_brood', name: "Mother's Brood", achievement: 'boss_mire_mother_x3', description: "Enemies that can spawn always spawn on first opportunity." },
  { id: 'deaths_whisper', name: "Death's Whisper", achievement: 'boss_bone_speaker_x3', description: "Start each encounter at -10 morale." },
  { id: 'rare_collector', name: "Rare Collector", achievement: 'hero_three_rares', description: "Uncommon/rare items drop 30% less." },
  { id: 'golden_challenge', name: "Golden Challenge", achievement: 'hero_only_rares', description: "Start with 1 fewer die (3 instead of 4)." },
  { id: 'ultimate_test', name: "Ultimate Test", achievement: 'party_all_rares', description: "All curses active simultaneously." },
];

class Game {
  constructor() {
    this.engine = new CombatEngine();
    this.ui = new GameUI(this.engine);
    this.lifetimeRenown = this.loadLifetimeRenown();
    this.settings = this.loadSettings();
    this.stats = this.loadStats();
    this.achievements = this.loadAchievements();
    this.difficulty = 1;
    this.marchCount = 0;
    this.activeCurses = [];
    this.selectedPartyClasses = [];

    // Music system
    this.currentTrack = null;
    this.nextTrack = null;
    this.musicMode = 'none';
    this.musicStarted = false;
    this.fadeInterval = null;
    this.audioCtx = null;
    this.lowpassFilter = null;
    this.currentSource = null;

    this.showHomeScreen();
    this.bindStartScreen();
    this.bindMenuButtons();
  }

  // --- Settings ---
  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { musicVolume: 15, soundVolume: 50 };
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  // --- Music ---
  getMusicVolume() {
    return this.settings.musicVolume / 100;
  }

  initAudioContext() {
    if (this.audioCtx) return;
    // Skip Web Audio API on file:// protocol — it can't connect MediaElementSource
    if (window.location.protocol === 'file:') {
      this.audioFilterActive = false;
      return;
    }
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Lowpass filter
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = 20000;
      this.lowpassFilter.Q.value = 0.7;

      // Convolver reverb (generated impulse response)
      this.reverbNode = this.audioCtx.createConvolver();
      this.reverbNode.buffer = this.createReverbImpulse(2.5, 3.0); // 2.5s decay, dark
      this.reverbGain = this.audioCtx.createGain();
      this.reverbGain.gain.value = 0; // starts dry (no reverb)

      // Dry path: source → lowpass → destination
      // Wet path: source → lowpass → reverb → reverbGain → destination
      this.dryGain = this.audioCtx.createGain();
      this.dryGain.gain.value = 1.0;

      this.lowpassFilter.connect(this.dryGain);
      this.dryGain.connect(this.audioCtx.destination);

      this.lowpassFilter.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.audioCtx.destination);
    } catch (e) {
      this.audioCtx = null;
      this.audioFilterActive = false;
    }
  }

  createReverbImpulse(duration, decay) {
    const rate = this.audioCtx.sampleRate;
    const length = rate * duration;
    const buffer = this.audioCtx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  connectTrackToFilter(audio) {
    if (!this.audioCtx) return;
    try {
      const source = this.audioCtx.createMediaElementSource(audio);
      source.connect(this.lowpassFilter);
      this.currentSource = source;
      this.audioFilterActive = true;
    } catch (e) {
      this.audioFilterActive = false;
    }
  }

  updateMoraleLowpass(morale) {
    if (this.audioFilterActive && this.lowpassFilter && this.audioCtx) {
      const t = this.audioCtx.currentTime;

      // Lowpass — stronger cutoff at low morale
      let freq;
      if (morale >= 50) freq = 20000;
      else if (morale >= 0) freq = 3000 + (morale / 50) * 17000;
      else freq = 250 + ((morale + 100) / 100) * 2750;
      this.lowpassFilter.frequency.setTargetAtTime(freq, t, 0.8);

      // Reverb — wet mix increases at low morale (cavernous, haunted)
      if (this.reverbGain && this.dryGain) {
        let wetAmount = 0;
        let dryAmount = 1.0;
        if (morale < 0) {
          wetAmount = (Math.abs(morale) / 100) * 0.45; // up to 0.45 wet at -100
          dryAmount = 1.0 - wetAmount * 0.3; // slight dry reduction
        }
        this.reverbGain.gain.setTargetAtTime(wetAmount, t, 0.8);
        this.dryGain.gain.setTargetAtTime(dryAmount, t, 0.8);
      }

      // Volume boost to compensate for muffling
      if (this.currentTrack) {
        const baseVol = this.getMusicVolume();
        let volBoost = 1.0;
        if (morale < 0) volBoost = 1.0 + (Math.abs(morale) / 100) * 0.5;
        this.currentTrack.volume = Math.min(1.0, baseVol * volBoost);
      }

      // Pitch down at low morale — subtle detune
      if (this.currentTrack) {
        let rate = 1.0;
        if (morale < 0) rate = 1.0 - (Math.abs(morale) / 100) * 0.04; // down to 0.96x at -100
        this.currentTrack.playbackRate = rate;
      }
    } else if (this.currentTrack) {
      // Fallback without Web Audio: volume + slowdown only
      const baseVol = this.getMusicVolume();
      let volMult = 1.0;
      let rate = 1.0;
      if (morale < 0) {
        volMult = 1.0 + (Math.abs(morale) / 100) * 0.3; // slightly louder
        rate = 1.0 - (Math.abs(morale) / 100) * 0.04; // subtle pitch-down
      }
      this.currentTrack.volume = Math.min(1.0, baseVol * volMult);
      this.currentTrack.playbackRate = rate;
    }
  }

  playTrack(src, loop = true) {
    this.initAudioContext();
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = this.getMusicVolume();
    // Connect to Web Audio API filter if available (not on file://)
    if (this.audioCtx) {
      this.connectTrackToFilter(audio);
    }
    audio.play().catch(() => {});
    if (!loop) {
      audio.addEventListener('ended', () => {
        if (this.musicMode === 'gameplay') {
          this.playNextGameplayTrack();
        }
      });
    }
    return audio;
  }

  stopTrack(audio, fadeMs = 0) {
    if (!audio) return;
    if (fadeMs <= 0) {
      audio.pause();
      audio.src = '';
      return;
    }
    // Fade out
    const steps = 20;
    const stepMs = fadeMs / steps;
    const volStep = audio.volume / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, audio.volume - volStep);
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.src = '';
      }
    }, stepMs);
  }

  fadeToTrack(src, loop = true) {
    const fadeMs = 1500;
    this.stopTrack(this.currentTrack, fadeMs);
    // Start new track quietly and fade in
    const newTrack = this.playTrack(src, loop);
    newTrack.volume = 0;
    const targetVol = this.getMusicVolume();
    const steps = 20;
    const stepMs = fadeMs / steps;
    const volStep = targetVol / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      newTrack.volume = Math.min(targetVol, newTrack.volume + volStep);
      if (step >= steps) {
        clearInterval(interval);
        newTrack.volume = targetVol;
      }
    }, stepMs);
    this.currentTrack = newTrack;
  }

  startMenuMusic() {
    if (this.musicMode === 'menu') return;
    this.musicMode = 'menu';
    if (this.currentTrack && this.musicStarted) {
      this.fadeToTrack(MUSIC_MENU, true);
    } else {
      this.currentTrack = this.playTrack(MUSIC_MENU, true);
      this.musicStarted = true;
    }
  }

  startGameplayMusic() {
    if (this.musicMode === 'gameplay') return;
    this.musicMode = 'gameplay';
    this.playNextGameplayTrack();
  }

  playNextGameplayTrack() {
    const src = MUSIC_GAMEPLAY[Math.floor(Math.random() * MUSIC_GAMEPLAY.length)];
    if (this.currentTrack && this.musicStarted) {
      this.fadeToTrack(src, false);
    } else {
      this.currentTrack = this.playTrack(src, false);
      this.musicStarted = true;
    }
  }

  startBossMusic() {
    if (this.musicMode === 'boss') return;
    this.musicMode = 'boss';
    this.fadeToTrack(MUSIC_BOSS, true);
  }

  resumeGameplayMusic() {
    if (this.musicMode === 'gameplay') return;
    this.musicMode = 'gameplay';
    this.playNextGameplayTrack();
  }

  setMusicVolume(val) {
    this.settings.musicVolume = val;
    if (this.currentTrack) this.currentTrack.volume = val / 100;
    this.saveSettings();
  }

  setSoundVolume(val) {
    this.settings.soundVolume = val;
    this.saveSettings();
  }

  // --- Renown ---
  loadLifetimeRenown() {
    try {
      const stored = localStorage.getItem(RENOWN_STORAGE_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch (e) { return 0; }
  }

  saveLifetimeRenown() {
    try { localStorage.setItem(RENOWN_STORAGE_KEY, String(this.lifetimeRenown)); } catch (e) {}
  }

  addRunRenown(amount) {
    this.lifetimeRenown += amount;
    this.saveLifetimeRenown();
  }

  // --- Screens ---
  showHomeScreen() {
    this.ui.showScreen('title-screen');
    const renownEl = document.getElementById('home-renown-value');
    if (renownEl) renownEl.textContent = this.lifetimeRenown;
    if (this.musicStarted) this.startMenuMusic();
  }

  returnHome() {
    this.showHomeScreen();
  }

  showOptionsScreen() {
    // Track which screen we came from so Back returns there
    const active = document.querySelector('.screen.active');
    if (active && active.id !== 'options-screen') {
      this.previousScreen = active.id;
    }
    this.ui.showScreen('options-screen');
    document.getElementById('opt-music-vol').value = this.settings.musicVolume;
    document.getElementById('opt-music-val').textContent = this.settings.musicVolume + '%';
    document.getElementById('opt-sound-vol').value = this.settings.soundVolume;
    document.getElementById('opt-sound-val').textContent = this.settings.soundVolume + '%';
  }

  // --- Bindings ---
  bindStartScreen() {
    document.getElementById('btn-start').addEventListener('click', () => {
      if (!this.musicStarted) {
        this.currentTrack = this.playTrack(MUSIC_MENU, true);
        this.musicStarted = true;
        this.musicMode = 'menu';
      }
      this.showPartySelectScreen();
    });
  }

  // --- Party Selection Screen ---
  showPartySelectScreen() {
    this.selectedPartyClasses = [];
    this.activeCurses = [];
    this.ui.showScreen('party-select-screen');
    this.renderPartySelect();
  }

  renderPartySelect() {
    const container = document.getElementById('party-select-classes');
    const curseContainer = document.getElementById('party-select-curses');
    const marchBtn = document.getElementById('btn-march');
    const countLabel = document.getElementById('party-select-count');

    // Render class cards
    let html = '';
    for (const [classId, data] of Object.entries(CLASS_DATA)) {
      const selected = this.selectedPartyClasses.includes(classId);
      const primaryTag = data.tags.find(t => t !== 'roman') || 'roman';
      const tagPips = data.tags.map(t => `<span class="tag-pip tag-${t}"></span>`).join('');
      const starterSkills = data.skills.filter(s => s.starter);
      const skillList = starterSkills.map(s => {
        const costLabel = s.cost.label || 'Any';
        return `<div class="ps-skill"><span class="ps-skill-cost">[${costLabel}]</span> ${s.name} <span class="ps-skill-desc">${s.description}</span></div>`;
      }).join('');

      html += `<div class="ps-class-card ${selected ? 'selected' : ''} class-${primaryTag}" data-class-id="${classId}">
        <div class="ps-class-header">
          <span class="ps-class-name">${data.name}</span>
          <span class="ps-class-title">${data.title}</span>
          <span class="ps-class-tags">${tagPips}</span>
        </div>
        <div class="ps-class-hp">HP: ${data.maxHp}</div>
        <div class="ps-class-passive"><strong>${data.passive.name}:</strong> ${data.passive.description}</div>
        <div class="ps-class-skills">${skillList}</div>
      </div>`;
    }
    container.innerHTML = html;

    // Bind class card clicks
    container.querySelectorAll('.ps-class-card').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.classId;
        const idx = this.selectedPartyClasses.indexOf(cid);
        if (idx >= 0) {
          this.selectedPartyClasses.splice(idx, 1);
        } else if (this.selectedPartyClasses.length < 3) {
          this.selectedPartyClasses.push(cid);
        }
        this.renderPartySelect();
      });
    });

    // Update count and button
    countLabel.textContent = `${this.selectedPartyClasses.length} / 3 selected`;
    marchBtn.disabled = this.selectedPartyClasses.length !== 3;

    // Render curses
    let curseHtml = '';
    const unlockedAchievements = this.achievements;
    let anyUnlocked = false;
    CURSE_DEFS.forEach(curse => {
      const unlocked = !!unlockedAchievements[curse.achievement];
      if (!unlocked) return;
      anyUnlocked = true;
      const active = this.activeCurses.includes(curse.id);
      curseHtml += `<div class="ps-curse-card ${active ? 'active' : ''}" data-curse-id="${curse.id}">
        <div class="ps-curse-name">${curse.name}</div>
        <div class="ps-curse-desc">${curse.description}</div>
      </div>`;
    });
    if (!anyUnlocked) {
      curseHtml = '<div class="ps-curse-none">No curses unlocked yet. Earn achievements to unlock modifiers.</div>';
    }
    curseContainer.innerHTML = curseHtml;

    // Bind curse clicks
    curseContainer.querySelectorAll('.ps-curse-card').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.curseId;
        // Ultimate Test: toggles all curses
        if (cid === 'ultimate_test') {
          if (this.activeCurses.includes('ultimate_test')) {
            this.activeCurses = [];
          } else {
            this.activeCurses = CURSE_DEFS.filter(c => !!unlockedAchievements[c.achievement]).map(c => c.id);
          }
        } else {
          const idx = this.activeCurses.indexOf(cid);
          if (idx >= 0) {
            this.activeCurses.splice(idx, 1);
            // Remove ultimate_test if deselecting individual curse
            const utIdx = this.activeCurses.indexOf('ultimate_test');
            if (utIdx >= 0) this.activeCurses.splice(utIdx, 1);
          } else {
            this.activeCurses.push(cid);
          }
        }
        this.renderPartySelect();
      });
    });

    // March button handler (re-bind each render)
    marchBtn.onclick = () => {
      if (this.selectedPartyClasses.length === 3) {
        this.startNewRun();
      }
    };
  }

  bindMenuButtons() {
    document.getElementById('btn-unlocks').addEventListener('click', () => {
      this.ui.showScreen('unlocks-screen');
      const el = document.getElementById('unlocks-renown-value');
      if (el) el.textContent = this.lifetimeRenown;
    });
    document.getElementById('btn-unlocks-back').addEventListener('click', () => this.showHomeScreen());

    document.getElementById('btn-options').addEventListener('click', () => {
      this.previousScreen = 'title-screen';
      this.showOptionsScreen();
    });
    document.getElementById('btn-options-back').addEventListener('click', () => {
      this.ui.showScreen(this.previousScreen || 'title-screen');
    });

    const musicSlider = document.getElementById('opt-music-vol');
    const musicVal = document.getElementById('opt-music-val');
    musicSlider.addEventListener('input', () => {
      const v = parseInt(musicSlider.value);
      musicVal.textContent = v + '%';
      this.setMusicVolume(v);
    });

    const soundSlider = document.getElementById('opt-sound-vol');
    const soundVal = document.getElementById('opt-sound-val');
    soundSlider.addEventListener('input', () => {
      const v = parseInt(soundSlider.value);
      soundVal.textContent = v + '%';
      this.setSoundVolume(v);
    });

    // Stats & Achievements buttons
    document.getElementById('btn-stats').addEventListener('click', () => this.showStatsScreen());
    document.getElementById('btn-stats-back').addEventListener('click', () => this.showHomeScreen());
    document.getElementById('btn-achievements').addEventListener('click', () => this.showAchievementsScreen());
    document.getElementById('btn-achievements-back').addEventListener('click', () => this.showHomeScreen());
  }

  // --- Stats ---
  loadStats() {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { enemiesKilled: {}, totalDamageDealt: 0, totalHealingDone: 0, totalBlockGenerated: 0, totalDamageTaken: 0, totalMoraleRestored: 0, encountersWon: 0, bossesKilled: 0, runsCompleted: 0, runsLost: 0, highestDifficulty: 1 };
  }

  saveStats() {
    try { localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats)); } catch (e) {}
  }

  trackEncounterStats() {
    // Called after each combat victory
    this.engine.party.forEach(u => {
      this.stats.totalDamageDealt += u.stats.damageDealt || 0;
      this.stats.totalHealingDone += u.stats.healingDone || 0;
      this.stats.totalBlockGenerated += u.stats.blockGenerated || 0;
      this.stats.totalDamageTaken += u.stats.damageTaken || 0;
      this.stats.totalMoraleRestored += u.stats.moraleRestored || 0;
    });
    this.engine.killedEnemies.forEach(eid => {
      this.stats.enemiesKilled[eid] = (this.stats.enemiesKilled[eid] || 0) + 1;
    });
    this.stats.encountersWon++;
    if (this.engine.hasBossEnemy()) this.stats.bossesKilled++;
    if (this.difficulty > this.stats.highestDifficulty) this.stats.highestDifficulty = this.difficulty;
    this.saveStats();
  }

  trackRunEnd(victory) {
    if (victory) this.stats.runsCompleted++;
    else this.stats.runsLost++;
    this.saveStats();
    this.checkAchievements();
  }

  showStatsScreen() {
    this.ui.showScreen('stats-screen');
    const content = document.getElementById('stats-content');
    const s = this.stats;

    let html = '<div class="stats-section">';
    html += `<div class="stats-row"><span>Encounters Won</span><span>${s.encountersWon}</span></div>`;
    html += `<div class="stats-row"><span>Bosses Killed</span><span>${s.bossesKilled}</span></div>`;
    html += `<div class="stats-row"><span>Runs Completed</span><span>${s.runsCompleted}</span></div>`;
    html += `<div class="stats-row"><span>Runs Lost</span><span>${s.runsLost}</span></div>`;
    html += `<div class="stats-row"><span>Highest March</span><span>${s.highestDifficulty}</span></div>`;
    html += `<div class="stats-row"><span>Total Damage Dealt</span><span>${s.totalDamageDealt}</span></div>`;
    html += `<div class="stats-row"><span>Total Healing Done</span><span>${s.totalHealingDone}</span></div>`;
    html += `<div class="stats-row"><span>Total Block Generated</span><span>${s.totalBlockGenerated}</span></div>`;
    html += `<div class="stats-row"><span>Total Damage Taken</span><span>${s.totalDamageTaken}</span></div>`;
    html += `<div class="stats-row"><span>Total Morale Restored</span><span>${s.totalMoraleRestored}</span></div>`;
    html += '</div>';

    // Enemy kill counts
    const enemyIds = Object.keys(s.enemiesKilled).sort((a, b) => s.enemiesKilled[b] - s.enemiesKilled[a]);
    if (enemyIds.length > 0) {
      html += '<div class="stats-section-title">ENEMIES SLAIN</div><div class="stats-section">';
      enemyIds.forEach(eid => {
        const data = ENEMY_DATA[eid];
        const name = data ? data.name : eid;
        html += `<div class="stats-row"><span>${name}</span><span>${s.enemiesKilled[eid]}</span></div>`;
      });
      html += '</div>';
    }

    content.innerHTML = html;
  }

  // --- Achievements ---
  loadAchievements() {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  }

  saveAchievements() {
    try { localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(this.achievements)); } catch (e) {}
  }

  checkAchievements() {
    const s = this.stats;
    const a = this.achievements;

    // Boss kill achievements (3 kills each)
    const bossIds = ['arminius_champion', 'grove_witch', 'silent_huntsman', 'mire_mother', 'bone_speaker'];
    bossIds.forEach(bid => {
      const key = 'boss_' + bid + '_x3';
      if (!a[key] && (s.enemiesKilled[bid] || 0) >= 3) {
        a[key] = true;
        const data = ENEMY_DATA[bid];
        this.addNotification(`Achievement: Defeated ${data ? data.name : bid} 3 times!`);
      }
    });

    // Check party equipment for rare achievements (at run end)
    if (this.engine && this.engine.party) {
      // One hero with 3 rare items
      const hasThreeRares = this.engine.party.some(u => {
        let rareCount = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { const item = getItemData(id); if (item && item.rarity === 'rare') rareCount++; }
          });
        }
        return rareCount >= 3;
      });
      if (hasThreeRares && !a.hero_three_rares) {
        a.hero_three_rares = true;
        this.addNotification('Achievement: A hero equipped 3 rare items!');
      }

      // One hero with only rare items (all slots filled, all rare)
      const hasOnlyRares = this.engine.party.some(u => {
        let total = 0, rares = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { total++; const item = getItemData(id); if (item && item.rarity === 'rare') rares++; }
          });
        }
        return total >= 5 && rares === total;
      });
      if (hasOnlyRares && !a.hero_only_rares) {
        a.hero_only_rares = true;
        this.addNotification('Achievement: A hero equipped ONLY rare items!');
      }

      // Full party with only rare items
      const allOnlyRares = this.engine.party.every(u => {
        let total = 0, rares = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { total++; const item = getItemData(id); if (item && item.rarity === 'rare') rares++; }
          });
        }
        return total >= 5 && rares === total;
      });
      if (allOnlyRares && !a.party_all_rares) {
        a.party_all_rares = true;
        this.addNotification('Achievement: Entire party equipped with only rare items!');
      }
    }

    this.saveAchievements();
  }

  addNotification(text) {
    // Simple log for now — could be a toast popup later
    console.log('[ACHIEVEMENT] ' + text);
  }

  showAchievementsScreen() {
    this.ui.showScreen('achievements-screen');
    const content = document.getElementById('achievements-content');
    const a = this.achievements;
    const s = this.stats;

    const ACHIEVEMENT_DEFS = [
      { key: 'boss_arminius_champion_x3', name: "Champion Slayer", desc: "Defeat Arminius's Champion 3 times.", progress: () => Math.min(3, s.enemiesKilled['arminius_champion'] || 0) + '/3' },
      { key: 'boss_grove_witch_x3', name: "Witch Hunter", desc: "Defeat the Grove Witch 3 times.", progress: () => Math.min(3, s.enemiesKilled['grove_witch'] || 0) + '/3' },
      { key: 'boss_silent_huntsman_x3', name: "Counter-Sniper", desc: "Defeat the Silent Huntsman 3 times.", progress: () => Math.min(3, s.enemiesKilled['silent_huntsman'] || 0) + '/3' },
      { key: 'boss_mire_mother_x3', name: "Beast Tamer", desc: "Defeat the Mire Mother 3 times.", progress: () => Math.min(3, s.enemiesKilled['mire_mother'] || 0) + '/3' },
      { key: 'boss_bone_speaker_x3', name: "Silence the Dead", desc: "Defeat the Bone Speaker 3 times.", progress: () => Math.min(3, s.enemiesKilled['bone_speaker'] || 0) + '/3' },
      { key: 'hero_three_rares', name: "Collector", desc: "Have one hero equipped with 3 rare items.", progress: () => a.hero_three_rares ? 'Done' : 'Not yet' },
      { key: 'hero_only_rares', name: "Gilded Warrior", desc: "Have one hero with only rare equipment.", progress: () => a.hero_only_rares ? 'Done' : 'Not yet' },
      { key: 'party_all_rares', name: "Legion of Gold", desc: "Entire party equipped with only rare items.", progress: () => a.party_all_rares ? 'Done' : 'Not yet' },
    ];

    let html = '';
    ACHIEVEMENT_DEFS.forEach(def => {
      const unlocked = !!a[def.key];
      html += `<div class="achievement-slot ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-name">${unlocked ? '&#9733; ' : ''}${def.name}</div>
        <div class="achievement-desc">${def.desc}</div>
        <div class="achievement-progress">${def.progress()}</div>
      </div>`;
    });

    content.innerHTML = html;
  }

  // --- Run management ---
  startNewRun() {
    this.difficulty = 1;
    this.marchCount = 0;
    this.engine.morale = 50;
    this.engine.totalEnemiesKilled = 0;
    this.engine.encountersCompleted = 0;
    this.engine.totalRenownEarned = 0;
    this.engine.pendingSkillPicks = 0;
    this.engine.difficulty = this.difficulty;

    // Use selected party or fallback to defaults
    const partyClasses = this.selectedPartyClasses.length === 3
      ? [...this.selectedPartyClasses]
      : ['legionary', 'centurion', 'medicus'];
    this.engine.initParty(partyClasses);

    this.startGameplayMusic();

    this.ui.mapNodes = generateMap(this.difficulty);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui.showMapScreen();
  }

  continueRun() {
    this.difficulty++;
    this.marchCount++;
    this.engine.difficulty = this.difficulty;

    this.resumeGameplayMusic();

    this.ui.mapNodes = generateMap(this.difficulty);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui.showMapScreen();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  loadGameData();
  window.game = new Game();
});
