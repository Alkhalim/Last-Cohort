// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

const RENOWN_STORAGE_KEY = 'lastCohort_renown';
const SETTINGS_STORAGE_KEY = 'lastCohort_settings';
const STATS_STORAGE_KEY = 'lastCohort_stats';
const ACHIEVEMENTS_STORAGE_KEY = 'lastCohort_achievements';
const RUN_HISTORY_STORAGE_KEY = 'lastCohort_runHistory';
const SAVED_RUN_STORAGE_KEY = 'lastCohort_savedRun';

const MUSIC_MENU = 'assets/music.mp3';
const MUSIC_GAMEPLAY = [
  'assets/Teutoburg Shadows.mp3',
  'assets/Forgotten Paths.mp3',
  'assets/Forest of Broken Eagles.mp3',
  'assets/Lost in the Muck.mp3',
  'assets/Legion in the Leaves.mp3',
  'assets/Frontier of the Unquiet Crown.mp3',
  'assets/Teutoburgs Black Earth.mp3',
  'assets/Eyes in the Undergrowth.mp3',
];
const MUSIC_BOSS = 'assets/Shadow of Arminius.mp3';
const MUSIC_BOSS_OVERRIDE = {
  'arminius_champion': 'assets/Champion of the Forest Warlord.mp3',
  'grove_witch': 'assets/Swamp Fury Unleashed.mp3',
  'serpent_shaman': 'assets/Venom Rite.mp3',
  'silent_huntsman': 'assets/Black Water March.mp3',
  'mire_mother': 'assets/Ironhide Rite.mp3',
  'fog_weaver': 'assets/Fog Remembers.mp3',
  'bone_speaker': 'assets/Bonefall.mp3',
  'blood_stag': 'assets/Blood Stag Rising.mp3',
  'revenant_of_ariovistus': 'assets/Barrow Raider.mp3',
  'corpse_of_arminius': 'assets/Chosen of Arminius.mp3',
  'corpse_of_varus': 'assets/Stahlwall.mp3',
  'spirit_of_varus': 'assets/Stahlwall.mp3',
  'spirit_of_arminius': 'assets/Legion of the Hollow Standard.mp3',
};

const MARCH_THEMES = {
  1:  { name: 'The Ambush Trail',     subtitle: 'The forest closes behind you.',   theme: 'forest', music: 'assets/Cohort Defiant.mp3' },
  2:  { name: 'The Hunting Grounds',  subtitle: 'They know these woods. You do not.', theme: 'forest-dark', music: 'assets/Hunters in the Canopy.mp3' },
  3:  { name: 'The Warcamp',          subtitle: 'Iron discipline guards the deep trail.', theme: 'warcamp', music: 'assets/Eisenmarsch.mp3' },
  4:  { name: 'The Poisoned Bog',     subtitle: 'The ground turns to black water.',  theme: 'bog', music: 'assets/Black Mire Pulse.mp3' },
  5:  { name: 'The Old Forest',       subtitle: 'Ancient things stir between the roots.', theme: 'ancient', music: 'assets/Roots Remember Blood.mp3' },
  6:  { name: 'The Blood Grove',      subtitle: 'Altars stained red. The druids watch.', theme: 'blood', music: 'assets/Crimson Ritual.mp3' },
  7:  { name: 'The Haunted March',    subtitle: 'The dead walk in Roman formation.',  theme: 'haunted', music: 'assets/Eagle of the Unremembered.mp3' },
  8:  { name: 'The Drowned Kingdom',  subtitle: 'Ruins swallowed by the swamp.',     theme: 'drowned', music: 'assets/Drowned Crown.mp3' },
  9:  { name: 'The Heart of the Forest', subtitle: 'The trees are flesh. The ground pulses.', theme: 'heart', music: 'assets/Root-Rot Cathedral.mp3' },
  10: { name: 'The Threshold',        subtitle: 'Between worlds. The spirits await.', theme: 'threshold', music: 'assets/Spirits at the Teutoburg Gate.mp3' },
};

// --- Curse Definitions ---
const CURSE_DEFS = [
  { id: 'champions_mark', name: "Warlord's Mark", achievement: 'boss_arminius_champion_x3', description: "Bosses have +20% HP.", renown: 10 },
  { id: 'witchs_gaze', name: "Witch's Gaze", achievement: 'boss_grove_witch_x3', description: "Morale decay +2 per turn.", renown: 20 },
  { id: 'hunters_shadow', name: "Hunter's Shadow", achievement: 'boss_silent_huntsman_x3', description: "Enemies deal +1 damage.", renown: 25 },
  { id: 'mothers_brood', name: "Mother's Brood", achievement: 'boss_mire_mother_x3', description: "Enemies that can spawn always spawn on first opportunity.", renown: 15 },
  { id: 'deaths_whisper', name: "Death's Whisper", achievement: 'boss_bone_speaker_x3', description: "Start each encounter at -5 morale.", renown: 20 },
  { id: 'rare_collector', name: "Rare Collector", achievement: 'hero_three_rares', description: "Uncommon/rare items drop 30% less.", renown: 10 },
  { id: 'golden_challenge', name: "Golden Challenge", achievement: 'hero_only_rares', description: "Start with 1 fewer die (3 instead of 4).", renown: 30 },
  { id: 'victors_burden', name: "Victor's Burden", achievement: 'class_vestalis', description: "Enemies gain +1 Block at the start of each turn.", renown: 15 },
  { id: 'ultimate_test', name: "Ultimate Test", achievement: 'party_all_rares', description: "All curses active simultaneously.", renown: 50 },
];

const BOON_DEFS = [
  { id: 'serpent_blessing', name: "Serpent's Blessing", achievement: 'boss_serpent_shaman_x3', description: "Start each combat with 1 Poison on all enemies.", renown: -10 },
  { id: 'fog_sight', name: "Fog Sight", achievement: 'boss_fog_weaver_x3', description: "Enemy intents always show exact damage numbers.", renown: -10 },
  { id: 'stag_vigor', name: "Stag's Vigor", achievement: 'boss_blood_stag_x3', description: "Heal 2 HP per unit at the start of each combat.", renown: -15 },
  { id: 'spirits_peace', name: "Spirit's Peace", achievement: 'boss_spirits_defeated', description: "Start each march at 60 morale instead of 50.", renown: -15 },
  { id: 'varus_lesson', name: "Varus's Lesson", achievement: 'boss_corpse_varus', description: "+1 bonus die on the first turn of each combat.", renown: -10 },
  { id: 'arminius_defiance', name: "Arminius's Defiance", achievement: 'boss_corpse_arminius', description: "Downed units revive with 20% more HP after fights.", renown: -20 },
  { id: 'fresh_recruits', name: "Fresh Recruits", achievement: 'first_boss_kill', description: "+2 max HP to all units at the start of each run.", renown: -10 },
  { id: 'scouts_blessing', name: "Scout's Blessing", achievement: 'first_elite_kill', description: "See enemy intents one turn earlier.", renown: -10 },
  { id: 'kings_hoard', name: "King's Hoard", achievement: 'boss_ariovistus', description: "Start each run with a random uncommon item.", renown: -10 },
  { id: 'first_blood', name: "First Blood", achievement: 'hero_first_epic', description: "+1 damage to all units for the first 2 turns of combat.", renown: -10 },
  { id: 'epic_fortune', name: "Epic Fortune", achievement: 'hero_three_epics', description: "Item drops have +10% chance to upgrade rarity.", renown: -15 },
  { id: 'demigods_shield', name: "Demigod's Shield", achievement: 'hero_only_epics', description: "All units start combat with 3 Block.", renown: -15 },
  { id: 'pantheons_grace', name: "Pantheon's Grace", achievement: 'party_all_epics', description: "All boons active simultaneously.", renown: -50 },
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
    this.activeBoons = [];
    this.selectedPartyClasses = [];

    // Disable umami if tracking opt-out
    if (!this.settings.trackingEnabled) {
      window['umami.disabled'] = true;
    }

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
    return { musicVolume: 15, soundVolume: 50, trackingEnabled: false, fullSoundtrack: false, reducedArt: false, fastMode: false };
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
    // Morale 0-100: 50 = neutral, below 50 = low morale effects
    const lowAmount = morale < 50 ? (50 - morale) / 50 : 0; // 0 at 50+, 1 at 0
    if (this.audioFilterActive && this.lowpassFilter && this.audioCtx) {
      const t = this.audioCtx.currentTime;

      // Lowpass — stronger cutoff at low morale
      let freq;
      if (morale >= 70) freq = 20000;
      else if (morale >= 50) freq = 3000 + ((morale - 50) / 20) * 17000;
      else freq = 250 + (morale / 50) * 2750;
      this.lowpassFilter.frequency.setTargetAtTime(freq, t, 0.8);

      // Reverb — wet mix increases at low morale (cavernous, haunted)
      if (this.reverbGain && this.dryGain) {
        const wetAmount = lowAmount * 0.45; // up to 0.45 wet at 0
        const dryAmount = 1.0 - wetAmount * 0.3;
        this.reverbGain.gain.setTargetAtTime(wetAmount, t, 0.8);
        this.dryGain.gain.setTargetAtTime(dryAmount, t, 0.8);
      }

      // Volume boost to compensate for muffling
      if (this.currentTrack) {
        const baseVol = this.getMusicVolume();
        const volBoost = 1.0 + lowAmount * 0.5;
        this.currentTrack.volume = Math.min(1.0, baseVol * volBoost);
      }

      // Pitch down at low morale — subtle detune
      if (this.currentTrack) {
        const rate = 1.0 - lowAmount * 0.04; // down to 0.96x at 0
        this.currentTrack.playbackRate = rate;
      }
    } else if (this.currentTrack) {
      // Fallback without Web Audio: volume + slowdown only
      const baseVol = this.getMusicVolume();
      const volMult = 1.0 + lowAmount * 0.3;
      const rate = 1.0 - lowAmount * 0.04;
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
    if (!this.settings.fullSoundtrack) {
      // Use menu track on loop to save mobile data
      if (this.currentTrack && this.musicStarted) {
        this.fadeToTrack(MUSIC_MENU, true);
      } else {
        this.currentTrack = this.playTrack(MUSIC_MENU, true);
        this.musicStarted = true;
      }
      return;
    }
    const src = MUSIC_GAMEPLAY[Math.floor(Math.random() * MUSIC_GAMEPLAY.length)];
    if (this.currentTrack && this.musicStarted) {
      this.fadeToTrack(src, false);
    } else {
      this.currentTrack = this.playTrack(src, false);
      this.musicStarted = true;
    }
  }

  startBossMusic(bossId) {
    if (this.musicMode === 'boss') return;
    this.musicMode = 'boss';
    // Start from silence — the intro splash already faded out previous music
    if (this.currentTrack) {
      this.stopTrack(this.currentTrack, 0);
      this.currentTrack = null;
    }
    let bossSrc;
    if (!this.settings.fullSoundtrack) {
      bossSrc = MUSIC_MENU;
    } else if (bossId && MUSIC_BOSS_OVERRIDE[bossId]) {
      bossSrc = MUSIC_BOSS_OVERRIDE[bossId];
    } else {
      bossSrc = MUSIC_BOSS;
    }
    this.currentTrack = this.playTrack(bossSrc, true);
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
    // Apply curse/boon renown modifier
    const curseBonus = this.activeCurses.reduce((sum, cid) => {
      const c = CURSE_DEFS.find(d => d.id === cid); return sum + (c ? c.renown : 0);
    }, 0);
    const boonPenalty = this.activeBoons.reduce((sum, bid) => {
      const b = BOON_DEFS.find(d => d.id === bid); return sum + (b ? b.renown : 0);
    }, 0);
    const modifier = 1 + (curseBonus + boonPenalty) / 100;
    const modified = Math.max(0, Math.round(amount * modifier));
    this.lifetimeRenown += modified;
    this.currentRunRenown = (this.currentRunRenown || 0) + modified;
    this.saveLifetimeRenown();
  }

  // --- Screens ---
  showHomeScreen() {
    this.ui.showScreen('title-screen');
    const renownEl = document.getElementById('home-renown-value');
    if (renownEl) renownEl.textContent = this.lifetimeRenown;
    const continueBtn = document.getElementById('btn-continue');
    if (continueBtn) continueBtn.style.display = this.hasSavedRun() ? 'block' : 'none';
    if (this.musicStarted) this.startMenuMusic();
  }

  returnHome() {
    this.clearSavedRun();
    if (this.engine) {
      this.finalizeLeaderboard(true);
    }
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
    const trackingCheckbox = document.getElementById('opt-tracking');
    trackingCheckbox.checked = this.isTrackingEnabled();
    document.getElementById('opt-tracking-val').textContent = this.isTrackingEnabled() ? 'On' : 'Off';
    const soundtrackCheckbox = document.getElementById('opt-full-soundtrack');
    soundtrackCheckbox.checked = !!this.settings.fullSoundtrack;
    document.getElementById('opt-full-soundtrack-val').textContent = this.settings.fullSoundtrack ? 'On' : 'Off';
    const reducedArtCheckbox = document.getElementById('opt-reduced-art');
    reducedArtCheckbox.checked = !!this.settings.reducedArt;
    document.getElementById('opt-reduced-art-val').textContent = this.settings.reducedArt ? 'On' : 'Off';
    const fastModeCheckbox = document.getElementById('opt-fast-mode');
    fastModeCheckbox.checked = !!this.settings.fastMode;
    document.getElementById('opt-fast-mode-val').textContent = this.settings.fastMode ? 'On' : 'Off';
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

    document.getElementById('btn-continue').addEventListener('click', () => {
      if (!this.musicStarted) {
        this.currentTrack = this.playTrack(MUSIC_MENU, true);
        this.musicStarted = true;
        this.musicMode = 'menu';
      }
      this.resumeSavedRun();
    });
  }

  // --- Party Selection Screen ---
  showPartySelectScreen() {
    this.selectedPartyClasses = [];
    this.activeCurses = [];
    this.activeBoons = [];
    this.ui.showScreen('party-select-screen');
    this.renderPartySelect();
  }

  renderPartySelect() {
    const container = document.getElementById('party-select-classes');
    const continueBtn = document.getElementById('btn-party-continue');
    const countLabel = document.getElementById('party-select-count');

    // Render class cards — locked classes show limited info
    let html = '';
    for (const [classId, data] of Object.entries(CLASS_DATA)) {
      const unlockKey = data.unlockKey || classId;
      const isUnlocked = !data.hidden || !!this.achievements[unlockKey];
      const selected = this.selectedPartyClasses.includes(classId);
      const primaryTag = data.tags.find(t => t !== 'roman' && t !== 'germanic') || 'roman';
      const tagPips = data.tags.map(t => `<span class="tag-pip tag-${t}"></span>`).join('');

      if (isUnlocked) {
        const complexity = data.complexity || 1;
        const complexityLabel = ['Simple', 'Moderate', 'Complex'][complexity - 1];
        const complexityPips = Array.from({ length: 3 }, (_, i) =>
          `<span class="complexity-pip${i < complexity ? ' filled' : ''}"></span>`
        ).join('');
        html += `<div class="ps-class-card ${selected ? 'selected' : ''} class-${primaryTag}" data-class-id="${classId}">
          <div class="ps-class-header">
            <span class="ps-class-name">${renderClassName(classId, data.name)}</span>
            <span class="ps-class-title">${data.title}</span>
            <span class="ps-class-tags">${tagPips}</span>
          </div>
          <div class="ps-class-desc">${data.description}</div>
          <div class="ps-class-meta">
            <span class="ps-class-hp">HP: ${data.maxHp}</span>
            <span class="ps-class-complexity">${complexityPips} <span class="complexity-label">${complexityLabel}</span></span>
          </div>
          <div class="ps-class-passive"><strong>${data.passive.name}:</strong> ${data.passive.description}</div>
        </div>`;
      } else {
        html += `<div class="ps-class-card locked class-${primaryTag}">
          <div class="ps-class-header">
            <span class="ps-class-name" style="opacity:0.5">${data.name}</span>
            <span class="ps-class-tags">${tagPips}</span>
          </div>
          <div class="ps-class-unlock"><span style="color:var(--text-dim)">🔒 ${data.unlockCondition}</span></div>
        </div>`;
      }
    }
    container.innerHTML = html;

    // Bind class card clicks (only unlocked)
    container.querySelectorAll('.ps-class-card:not(.locked)').forEach(card => {
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
    continueBtn.disabled = this.selectedPartyClasses.length !== 3;

    // Continue button: go to curse select (or straight to run if no curses unlocked)
    continueBtn.onclick = () => {
      if (this.selectedPartyClasses.length === 3) {
        const anyUnlocked = CURSE_DEFS.some(c => !!this.achievements[c.achievement]) || BOON_DEFS.some(b => !!this.achievements[b.achievement]);
        if (anyUnlocked) {
          this.showCurseSelectScreen();
        } else {
          this.startNewRun();
        }
      }
    };
  }

  // --- Curse Selection Screen ---
  showCurseSelectScreen() {
    this.ui.showScreen('curse-select-screen');
    this.renderCurseSelect();
  }

  renderCurseSelect() {
    const curseContainer = document.getElementById('curse-select-curses');
    const marchBtn = document.getElementById('btn-march');
    const totalLabel = document.getElementById('curse-renown-total');
    const unlockedAchievements = this.achievements;

    let html = '';

    // Curses section
    const unlockedCurses = CURSE_DEFS.filter(c => !!unlockedAchievements[c.achievement]);
    if (unlockedCurses.length > 0) {
      html += '<div class="ps-modifier-section-title" style="color:var(--red-bright)">CURSES <span style="font-size:0.6rem;color:var(--text-dim)">(increase Renown)</span></div>';
      unlockedCurses.forEach(curse => {
        const active = this.activeCurses.includes(curse.id);
        html += `<div class="ps-curse-card ${active ? 'active' : ''}" data-curse-id="${curse.id}" data-type="curse">
          <div class="ps-curse-name">${curse.name}</div>
          <div class="ps-curse-desc">${curse.description}</div>
          <div class="ps-curse-renown" style="color:var(--gold);font-size:0.75rem;margin-top:4px;">+${curse.renown}% Renown</div>
        </div>`;
      });
    }

    // Boons section
    const unlockedBoons = BOON_DEFS.filter(b => !!unlockedAchievements[b.achievement]);
    if (unlockedBoons.length > 0) {
      html += '<div class="ps-modifier-section-title" style="color:var(--green-bright);margin-top:12px">BOONS <span style="font-size:0.6rem;color:var(--text-dim)">(decrease Renown)</span></div>';
      unlockedBoons.forEach(boon => {
        const active = this.activeBoons.includes(boon.id);
        html += `<div class="ps-curse-card boon ${active ? 'active' : ''}" data-curse-id="${boon.id}" data-type="boon">
          <div class="ps-curse-name">${boon.name}</div>
          <div class="ps-curse-desc">${boon.description}</div>
          <div class="ps-curse-renown" style="color:var(--green-bright);font-size:0.75rem;margin-top:4px;">${boon.renown}% Renown</div>
        </div>`;
      });
    }

    curseContainer.innerHTML = html;

    // Show total renown modifier
    const curseBonus = this.activeCurses.reduce((sum, cid) => {
      const curse = CURSE_DEFS.find(c => c.id === cid);
      return sum + (curse ? curse.renown : 0);
    }, 0);
    const boonPenalty = this.activeBoons.reduce((sum, bid) => {
      const boon = BOON_DEFS.find(b => b.id === bid);
      return sum + (boon ? boon.renown : 0);
    }, 0);
    const totalMod = curseBonus + boonPenalty;
    if (totalMod > 0) totalLabel.textContent = `Renown modifier: +${totalMod}%`;
    else if (totalMod < 0) totalLabel.textContent = `Renown modifier: ${totalMod}%`;
    else totalLabel.textContent = 'No modifiers selected';

    // Bind clicks
    curseContainer.querySelectorAll('.ps-curse-card').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.curseId;
        const type = card.dataset.type;
        if (type === 'curse') {
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
              const utIdx = this.activeCurses.indexOf('ultimate_test');
              if (utIdx >= 0) this.activeCurses.splice(utIdx, 1);
            } else {
              this.activeCurses.push(cid);
            }
          }
        } else {
          // Boon toggle
          if (cid === 'pantheons_grace') {
            if (this.activeBoons.includes('pantheons_grace')) {
              this.activeBoons = [];
            } else {
              this.activeBoons = BOON_DEFS.filter(b => !!unlockedAchievements[b.achievement]).map(b => b.id);
            }
          } else {
            const idx = this.activeBoons.indexOf(cid);
            if (idx >= 0) {
              this.activeBoons.splice(idx, 1);
              const pgIdx = this.activeBoons.indexOf('pantheons_grace');
              if (pgIdx >= 0) this.activeBoons.splice(pgIdx, 1);
            } else {
              this.activeBoons.push(cid);
            }
          }
        }
        this.renderCurseSelect();
      });
    });

    marchBtn.onclick = () => this.startNewRun();
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

    // Full soundtrack toggle
    const soundtrackCheckbox = document.getElementById('opt-full-soundtrack');
    const soundtrackVal = document.getElementById('opt-full-soundtrack-val');
    soundtrackCheckbox.addEventListener('change', () => {
      this.settings.fullSoundtrack = soundtrackCheckbox.checked;
      soundtrackVal.textContent = soundtrackCheckbox.checked ? 'On' : 'Off';
      this.saveSettings();
    });

    // Fast mode toggle
    const fastModeCheckbox = document.getElementById('opt-fast-mode');
    const fastModeVal = document.getElementById('opt-fast-mode-val');
    fastModeCheckbox.addEventListener('change', () => {
      this.settings.fastMode = fastModeCheckbox.checked;
      fastModeVal.textContent = fastModeCheckbox.checked ? 'On' : 'Off';
      this.saveSettings();
    });

    // Reduced art toggle
    const reducedArtCheckbox = document.getElementById('opt-reduced-art');
    const reducedArtVal = document.getElementById('opt-reduced-art-val');
    reducedArtCheckbox.addEventListener('change', () => {
      this.settings.reducedArt = reducedArtCheckbox.checked;
      reducedArtVal.textContent = reducedArtCheckbox.checked ? 'On' : 'Off';
      this.saveSettings();
    });

    // Tracking toggle
    const trackingCheckbox = document.getElementById('opt-tracking');
    const trackingVal = document.getElementById('opt-tracking-val');
    trackingCheckbox.addEventListener('change', () => {
      this.setTracking(trackingCheckbox.checked);
      trackingVal.textContent = trackingCheckbox.checked ? 'On' : 'Off';
    });

    // Stats & Achievements buttons
    document.getElementById('btn-stats').addEventListener('click', () => this.showStatsScreen());
    document.getElementById('btn-stats-back').addEventListener('click', () => this.showHomeScreen());
    document.getElementById('btn-achievements').addEventListener('click', () => this.showAchievementsScreen());
    document.getElementById('btn-achievements-back').addEventListener('click', () => this.showHomeScreen());

    // Run History
    document.getElementById('btn-run-history').addEventListener('click', () => this.showRunHistoryScreen());
    document.getElementById('btn-run-history-back').addEventListener('click', () => this.showHomeScreen());
    document.getElementById('btn-run-detail-back').addEventListener('click', () => this.showRunHistoryScreen());
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
    this.clearSavedRun();
    if (victory) this.stats.runsCompleted++;
    else this.stats.runsLost++;
    this.saveStats();
    this.checkAchievements();
    this.sendAnalytics(victory);
    // Leaderboard entry is saved when the run actually ends (defeat or return home), not here
    if (!victory) {
      this.finalizeLeaderboard(victory);
    }
  }

  finalizeLeaderboard(victory) {
    if (this._leaderboardSaved) return;
    this._leaderboardSaved = true;
    const leaderboardPos = this.saveRunToHistory(victory);
    if (leaderboardPos >= 0 && leaderboardPos < 10) {
      this.showHighscorePopup(leaderboardPos + 1);
    }
  }

  // --- Run Save/Resume ---
  saveRun() {
    try {
      const data = {
        difficulty: this.difficulty,
        marchCount: this.marchCount,
        activeCurses: [...(this.activeCurses || [])],
        activeBoons: [...(this.activeBoons || [])],
        selectedPartyClasses: [...(this.selectedPartyClasses || [])],
        currentRunRenown: this.currentRunRenown || 0,
        recentBosses: [...(this.recentBosses || [])],
        usedRunEventIds: [...(this.usedRunEventIds || [])],
        morale: this.engine.morale,
        totalEnemiesKilled: this.engine.totalEnemiesKilled,
        encountersCompleted: this.engine.encountersCompleted,
        totalRenownEarned: this.engine.totalRenownEarned,
        pendingSkillPicks: this.engine.pendingSkillPicks,
        encounterXP: this.engine.encounterXP || 0,
        skillUsageStats: { ...(this.engine.skillUsageStats || {}) },
        runKilledBosses: [...(this.engine.runKilledBosses || [])],
        party: this.engine.party.map(u => ({
          index: u.index, classId: u.classId, name: u.name, title: u.title,
          hp: u.hp, maxHp: u.maxHp, baseMaxHp: u.baseMaxHp, downed: u.downed,
          bonusDamage: u.bonusDamage || 0, bonusBlock: u.bonusBlock || 0, bonusHeal: u.bonusHeal || 0, bonusPoison: u.bonusPoison || 0,
          equipment: { weapon: [...u.equipment.weapon], armor: [...u.equipment.armor], trinket: [...u.equipment.trinket] },
          learnedSkillIds: u.skills.map(s => s.id),
          runStats: { ...(u.runStats || {}) },
          stats: { ...(u.stats || {}) },
        })),
        mapNodes: this.ui.mapNodes,
        currentNodeId: this.ui.currentNodeId,
        uiDifficulty: this.ui.difficulty,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SAVED_RUN_STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.warn('Failed to save run:', e); }
  }

  clearSavedRun() {
    try { localStorage.removeItem(SAVED_RUN_STORAGE_KEY); } catch (e) {}
  }

  hasSavedRun() {
    try { return !!localStorage.getItem(SAVED_RUN_STORAGE_KEY); } catch (e) { return false; }
  }

  resumeSavedRun() {
    try {
      const raw = localStorage.getItem(SAVED_RUN_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      this.difficulty = data.difficulty;
      this.marchCount = data.marchCount;
      this.activeCurses = data.activeCurses || [];
      this.activeBoons = data.activeBoons || [];
      this.selectedPartyClasses = data.selectedPartyClasses || [];
      this.currentRunRenown = data.currentRunRenown || 0;
      this.recentBosses = data.recentBosses || [];
      this.usedRunEventIds = new Set(data.usedRunEventIds || []);
      this._leaderboardSaved = false;

      this.engine.morale = data.morale;
      this.engine.totalEnemiesKilled = data.totalEnemiesKilled;
      this.engine.encountersCompleted = data.encountersCompleted;
      this.engine.totalRenownEarned = data.totalRenownEarned;
      this.engine.pendingSkillPicks = data.pendingSkillPicks;
      this.engine.encounterXP = data.encounterXP || 0;
      this.engine.skillUsageStats = data.skillUsageStats || {};
      this.engine.runKilledBosses = data.runKilledBosses || [];
      this.engine.difficulty = this.difficulty;

      this.engine.party = data.party.map(saved => {
        const classData = CLASS_DATA[saved.classId];
        const allSkills = classData.skills.map(s => ({ ...s }));
        const learnedSet = new Set(saved.learnedSkillIds);
        const skills = allSkills.filter(s => learnedSet.has(s.id)).map(s => ({ ...s }));
        const unit = {
          index: saved.index, classId: saved.classId, name: saved.name, title: saved.title,
          maxHp: saved.maxHp, baseMaxHp: saved.baseMaxHp, hp: saved.hp, block: 0,
          downed: saved.downed, poison: 0,
          allSkills, skills,
          passive: { ...classData.passive }, passiveTriggered: false,
          buffs: [], taunt: false, actedThisTurn: false, conditions: [],
          equipment: { weapon: saved.equipment.weapon, armor: saved.equipment.armor, trinket: saved.equipment.trinket },
          equipDamage: 0, equipBlock: 0, equipHeal: 0, equipPoison: 0, equipExtraDice: 0,
          bonusDamage: saved.bonusDamage || 0, bonusBlock: saved.bonusBlock || 0, bonusHeal: saved.bonusHeal || 0, bonusPoison: saved.bonusPoison || 0,
          stats: saved.stats || { damageDealt:0, healingDone:0, blockGenerated:0, blockAbsorbed:0, moraleRestored:0, damageTaken:0, poisonInflicted:0, poisonDamageDealt:0 },
          runStats: saved.runStats || { damageDealt:0, healingDone:0, blockGenerated:0, blockAbsorbed:0, moraleRestored:0, damageTaken:0, poisonInflicted:0, poisonDamageDealt:0 },
        };
        this.engine.computeEquipmentStats(unit);
        return unit;
      });

      // Re-create leveled item instances in ITEM_DATA after load
      this.engine.party.forEach(u => {
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (!id || ITEM_DATA[id]) return; // already registered or null
            // Parse baseId and level from instance ID pattern: baseId_lvN_xxxx
            const match = id.match(/^(.+)_lv(\d+)_/);
            if (match) {
              const baseId = match[1];
              const level = parseInt(match[2]);
              const bonusLevels = level - 1;
              if (bonusLevels > 0 && ITEM_DATA[baseId]) {
                const newId = createLeveledItem(baseId, bonusLevels);
                // Replace the equipment reference with the new instance
                const idx = u.equipment[slot].indexOf(id);
                if (idx >= 0) u.equipment[slot][idx] = newId;
              }
            }
          });
        }
        this.engine.computeEquipmentStats(u);
      });

      this.ui.mapNodes = data.mapNodes;
      this.ui.currentNodeId = data.currentNodeId;
      this.ui.difficulty = data.uiDifficulty || data.difficulty;

      this.startGameplayMusic();

      const theme = MARCH_THEMES[this.difficulty] || { theme: 'forest' };
      document.getElementById('map-screen').dataset.theme = theme.theme;

      this.ui.showMapScreen();
      return true;
    } catch (e) {
      console.warn('Failed to resume run:', e);
      this.clearSavedRun();
      return false;
    }
  }

  // --- Run History ---
  loadRunHistory() {
    try {
      const stored = localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  saveRunToHistory(victory) {
    const history = this.loadRunHistory();
    const party = this.engine.party.map(u => {
      // Combine run-wide stats with current encounter stats
      const combinedStats = {};
      const rs = u.runStats || {};
      const cs = u.stats || {};
      for (const key of Object.keys(cs)) {
        combinedStats[key] = (rs[key] || 0) + (cs[key] || 0);
      }
      return {
        classId: u.classId,
        name: u.name,
        title: u.title,
        hp: u.hp,
        maxHp: u.maxHp,
        downed: u.downed,
        skills: u.skills.map(s => s.name),
        equipment: Object.entries(u.equipment).reduce((acc, [slot, ids]) => {
          acc[slot] = ids.filter(Boolean).map(id => {
            const item = getItemData(id);
            return item ? { name: item.name, rarity: item.rarity, level: item.level || 1 } : null;
          }).filter(Boolean);
          return acc;
        }, {}),
        stats: combinedStats,
      };
    });

    // Determine cause of death (last log entry mentioning "falls" or "downed")
    let causeOfDeath = '';
    if (!victory && this.engine.combatLog) {
      const logs = this.engine.combatLog;
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i] && (logs[i].includes('falls') || logs[i].includes('downed') || logs[i].includes('defeated'))) {
          causeOfDeath = logs[i];
          break;
        }
      }
    }

    const entry = {
      date: new Date().toISOString(),
      victory: victory,
      marchesCleared: this.marchCount,
      difficulty: this.difficulty,
      renownEarned: this.currentRunRenown || this.engine.totalRenownEarned,
      encountersCompleted: this.engine.encountersCompleted,
      enemiesKilled: this.engine.totalEnemiesKilled,
      party: party,
      causeOfDeath: causeOfDeath,
    };

    history.push(entry);
    // Keep top 25 by renown
    history.sort((a, b) => b.renownEarned - a.renownEarned);
    if (history.length > 25) history.length = 25;

    // Find where this entry landed
    const position = history.findIndex(e => e === entry);

    try {
      localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}

    return position; // -1 if didn't make top 25
  }

  showHighscorePopup(rank) {
    const popup = document.createElement('div');
    popup.className = 'highscore-popup';
    popup.innerHTML = `
      <div class="highscore-popup-content">
        <div class="highscore-title">NEW HIGHSCORE</div>
        <div class="highscore-rank">#${rank}</div>
        <div class="highscore-subtitle">on the Leaderboard</div>
      </div>
    `;
    document.getElementById('game').appendChild(popup);

    // Auto-fade after 3 seconds
    setTimeout(() => {
      popup.classList.add('fade-out');
      setTimeout(() => popup.remove(), 600);
    }, 3000);

    // Click to dismiss
    popup.addEventListener('click', () => {
      popup.classList.add('fade-out');
      setTimeout(() => popup.remove(), 600);
    });
  }

  showRunHistoryScreen() {
    this.ui.showScreen('run-history-screen');
    const content = document.getElementById('run-history-content');
    const history = this.loadRunHistory();

    if (history.length === 0) {
      content.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">No runs recorded yet.</div>';
      return;
    }

    let html = '';
    history.forEach((run, idx) => {
      const partyStr = run.party.map(u => {
        const tag = (CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].tags.find(t => t !== 'roman') : '') || 'roman';
        return `<span style="color:var(--class-${tag})">${u.title}</span>`;
      }).join(' ');
      const date = new Date(run.date).toLocaleDateString();
      const outcome = run.victory ? '<span style="color:var(--green-bright)">Victory</span>' : '<span style="color:var(--red-bright)">Defeat</span>';

      const isTopTen = idx < 10;
      html += `<div class="rh-entry${isTopTen ? ' top-ten' : ''}" data-run-idx="${idx}">
        <div class="rh-entry-top">
          <span class="rh-entry-rank${isTopTen ? ' rank-big' : ''}">#${idx + 1}</span>
          <span class="rh-entry-party">${partyStr}</span>
          <span class="rh-entry-outcome">${outcome}</span>
        </div>
        <div class="rh-entry-bottom">
          <span class="rh-entry-renown">+${run.renownEarned} Renown</span>
          <span class="rh-entry-marches">${run.marchesCleared} march${run.marchesCleared !== 1 ? 'es' : ''}</span>
          <span class="rh-entry-date">${date}</span>
        </div>
      </div>`;
    });
    content.innerHTML = html;

    // Bind clicks to show detail
    content.querySelectorAll('.rh-entry').forEach(el => {
      el.addEventListener('click', () => {
        const ridx = parseInt(el.dataset.runIdx);
        this.showRunDetail(history[ridx]);
      });
    });
  }

  showRunDetail(run) {
    this.ui.showScreen('run-detail-screen');
    const title = document.getElementById('run-detail-title');
    title.textContent = run.victory ? 'VICTORY' : 'DEFEAT';
    const content = document.getElementById('run-detail-content');

    // Compute run-wide totals from party stats
    const totals = { damageDealt: 0, poisonDamageDealt: 0, healingDone: 0, blockAbsorbed: 0, damageTaken: 0 };
    (run.party || []).forEach(u => {
      const s = u.stats || {};
      totals.damageDealt += s.damageDealt || 0;
      totals.poisonDamageDealt += s.poisonDamageDealt || 0;
      totals.healingDone += s.healingDone || 0;
      totals.blockAbsorbed += s.blockAbsorbed || 0;
      totals.damageTaken += s.damageTaken || 0;
    });

    let html = '<div class="rd-stats">';
    html += `<div class="run-summary-stat"><span class="run-summary-label">Marches Cleared</span><span class="run-summary-value">${run.marchesCleared}</span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Encounters</span><span class="run-summary-value">${run.encountersCompleted}</span></div>`;
    html += `<div class="run-summary-stat"><span class="run-summary-label">Enemies Killed</span><span class="run-summary-value">${run.enemiesKilled}</span></div>`;
    html += `<div class="run-summary-stat renown-stat"><span class="run-summary-label">Renown</span><span class="run-summary-value renown-value">+${run.renownEarned}</span></div>`;
    html += '</div>';

    html += '<div class="rd-totals">';
    html += `<span class="rd-total"><span class="stat-dmg">${totals.damageDealt}</span> damage dealt</span>`;
    html += `<span class="rd-total"><span class="stat-poison">${totals.poisonDamageDealt}</span> poison damage</span>`;
    html += `<span class="rd-total"><span class="stat-heal">${totals.healingDone}</span> HP healed</span>`;
    html += `<span class="rd-total"><span class="stat-block">${totals.blockAbsorbed}</span> damage blocked</span>`;
    html += '</div>';

    if (run.causeOfDeath) {
      html += `<div class="rd-death"><strong>Last moment:</strong> ${run.causeOfDeath}</div>`;
    }

    html += '<h3 style="color:var(--text-bright);margin:12px 0 6px;font-family:Cinzel,serif;font-size:0.85rem;">COHORT</h3>';
    run.party.forEach(u => {
      const tag = (CLASS_DATA[u.classId] ? CLASS_DATA[u.classId].tags.find(t => t !== 'roman') : '') || 'roman';
      const status = u.downed ? '<span style="color:var(--red-bright)">FALLEN</span>' : `<span style="color:var(--green-bright)">${u.hp}/${u.maxHp} HP</span>`;
      html += `<div class="rd-unit">
        <div class="rd-unit-header">
          <span style="color:var(--class-${tag})">${u.name}</span> ${status}
        </div>`;

      // Stats
      const s = u.stats || {};
      html += `<div class="rd-unit-stats">`;
      if (s.damageDealt) html += `<span class="stat-dmg">${s.damageDealt} dmg</span>`;
      if (s.poisonDamageDealt) html += `<span class="stat-poison">${s.poisonDamageDealt} poison dmg</span>`;
      if (s.healingDone) html += `<span class="stat-heal">${s.healingDone} healed</span>`;
      if (s.blockAbsorbed) html += `<span class="stat-block">${s.blockAbsorbed} blocked</span>`;
      if (s.damageTaken) html += `<span style="color:var(--red-bright)">${s.damageTaken} taken</span>`;
      html += `</div>`;

      // Skills
      if (u.skills && u.skills.length > 0) {
        html += `<div class="rd-unit-skills">${u.skills.join(', ')}</div>`;
      }

      // Equipment
      const equip = u.equipment || {};
      const allItems = [...(equip.weapon || []), ...(equip.armor || []), ...(equip.trinket || [])];
      if (allItems.length > 0) {
        html += `<div class="rd-unit-items">${allItems.map(i =>
          `<span class="rd-item rarity-${i.rarity}">${i.name}${i.level > 1 ? ' +' + (i.level - 1) : ''}</span>`
        ).join(', ')}</div>`;
      }

      html += '</div>';
    });

    content.innerHTML = html;
  }

  // --- Analytics (Umami) ---
  sendAnalytics(victory) {
    if (!this.settings.trackingEnabled) return;
    if (typeof umami === 'undefined' || !umami.track) return;

    try {
      const party = this.engine.party.map(u => u.classId);
      const data = {
        result: victory ? 'victory' : 'defeat',
        difficulty: this.difficulty,
        marchCount: this.marchCount + 1,
        party: party.join(','),
        encountersCompleted: this.engine.encountersCompleted,
        enemiesKilled: this.engine.totalEnemiesKilled,
        renownEarned: this.engine.totalRenownEarned,
        finalMorale: this.engine.morale,
        cursesActive: this.activeCurses.length,
        curses: this.activeCurses.join(',') || 'none',
        skillUsage: JSON.stringify(this.engine.skillUsageStats || {}),
      };

      umami.track('run-end', data);
    } catch (e) {
      // Silently fail — analytics should never break gameplay
    }
  }

  isTrackingEnabled() {
    return this.settings.trackingEnabled !== false;
  }

  setTracking(enabled) {
    this.settings.trackingEnabled = enabled;
    this.saveSettings();
    // Disable umami if tracking is off
    if (!enabled && typeof umami !== 'undefined') {
      window['umami.disabled'] = true;
    } else {
      window['umami.disabled'] = false;
    }
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
      const friendlyNames = { bone_totem: 'Bone Totem', healing_totem: 'Healing Totem', serpent_shade: 'Serpent Shade', fog_illusion: 'Fog Illusion', barrow_guardian: 'Barrow Guardian' };
      enemyIds.forEach(eid => {
        const data = ENEMY_DATA[eid];
        const name = data ? data.name : (friendlyNames[eid] || eid.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
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

    // Boss kill achievements (3 kills each for regular bosses)
    const bossIds = ['arminius_champion', 'grove_witch', 'silent_huntsman', 'mire_mother', 'bone_speaker', 'serpent_shaman', 'fog_weaver', 'blood_stag'];
    bossIds.forEach(bid => {
      const key = 'boss_' + bid + '_x3';
      if (!a[key] && (s.enemiesKilled[bid] || 0) >= 3) {
        a[key] = true;
        const data = ENEMY_DATA[bid];
        this.addNotification(`Achievement: Defeated ${data ? data.name : bid} 3 times!`);
      }
    });

    // Story boss achievements (1 kill each)
    const storyBosses = [
      { id: 'corpse_of_arminius', key: 'boss_corpse_arminius' },
      { id: 'corpse_of_varus', key: 'boss_corpse_varus' },
      { id: 'spirit_of_arminius', key: 'boss_spirits_defeated' },
    ];
    storyBosses.forEach(sb => {
      if (!a[sb.key] && (s.enemiesKilled[sb.id] || 0) >= 1) {
        a[sb.key] = true;
        const data = ENEMY_DATA[sb.id];
        this.addNotification(`Achievement: ${data ? data.name : sb.id} defeated!`);
      }
    });
    // Ariovistus event boss
    if (!a.boss_ariovistus && (s.enemiesKilled['revenant_of_ariovistus'] || 0) >= 1) {
      a.boss_ariovistus = true;
      this.addNotification('Achievement: The dead king falls!');
    }

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

      // Epic equipment achievements
      const hasEpic = this.engine.party.some(u => {
        for (const slot of ['weapon', 'armor', 'trinket']) {
          for (const id of u.equipment[slot]) {
            if (id) { const item = getItemData(id); if (item && item.rarity === 'epic') return true; }
          }
        }
        return false;
      });
      if (hasEpic && !a.hero_first_epic) {
        a.hero_first_epic = true;
        this.addNotification('Achievement: Found your first epic item!');
      }

      const hasThreeEpics = this.engine.party.some(u => {
        let epicCount = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { const item = getItemData(id); if (item && item.rarity === 'epic') epicCount++; }
          });
        }
        return epicCount >= 3;
      });
      if (hasThreeEpics && !a.hero_three_epics) {
        a.hero_three_epics = true;
        this.addNotification('Achievement: A hero equipped 3 epic items!');
      }

      const hasOnlyEpics = this.engine.party.some(u => {
        let total = 0, epics = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { total++; const item = getItemData(id); if (item && item.rarity === 'epic') epics++; }
          });
        }
        return total >= 5 && epics === total;
      });
      if (hasOnlyEpics && !a.hero_only_epics) {
        a.hero_only_epics = true;
        this.addNotification('Achievement: A hero equipped ONLY epic items!');
      }

      const allOnlyEpics = this.engine.party.every(u => {
        let total = 0, epics = 0;
        for (const slot of ['weapon', 'armor', 'trinket']) {
          u.equipment[slot].forEach(id => {
            if (id) { total++; const item = getItemData(id); if (item && item.rarity === 'epic') epics++; }
          });
        }
        return total >= 5 && epics === total;
      });
      if (allOnlyEpics && !a.party_all_epics) {
        a.party_all_epics = true;
        this.addNotification('Achievement: Entire party equipped with only epic items!');
      }
    }

    // First boss/elite kill milestones
    if (!a.first_boss_kill && (s.bossesKilled || 0) >= 1) {
      a.first_boss_kill = true;
      this.addNotification('Achievement: First Boss Defeated!');
    }
    if (!a.first_elite_kill && s.enemiesKilled) {
      const eliteIds = ['oak_shield', 'wicker_man', 'ironbound_champion'];
      if (eliteIds.some(eid => (s.enemiesKilled[eid] || 0) >= 1)) {
        a.first_elite_kill = true;
        this.addNotification('Achievement: First Elite Defeated!');
      }
    }

    // Class unlock achievements
    // First boss kill → Sagittarius
    if (!a.class_sagittarius && (s.bossesKilled || 0) >= 1) {
      a.class_sagittarius = true;
      this.addNotification('Class Unlocked: Sagittarius!');
    }
    // First elite kill → Cornicen
    if (!a.class_cornicen && s.enemiesKilled) {
      const eliteIds = ['oak_shield', 'wicker_man', 'ironbound_champion'];
      const hasEliteKill = eliteIds.some(eid => (s.enemiesKilled[eid] || 0) >= 1);
      if (hasEliteKill) { a.class_cornicen = true; this.addNotification('Class Unlocked: Cornicen!'); }
    }
    // Reach march 3 → Signifer
    if (!a.class_signifer && (s.highestDifficulty || 1) >= 3) {
      a.class_signifer = true;
      this.addNotification('Class Unlocked: Signifer!');
    }
    // Reach march 5 → Equites
    if (!a.class_equites && (s.highestDifficulty || 1) >= 5) {
      a.class_equites = true;
      this.addNotification('Class Unlocked: Equites!');
    }
    // Reach march 7 → Ballistarius
    if (!a.class_ballistarius && (s.highestDifficulty || 1) >= 7) {
      a.class_ballistarius = true;
      this.addNotification('Class Unlocked: Ballistarius!');
    }
    // Reach march 8 → Cataphract
    if (!a.class_cataphract && (s.highestDifficulty || 1) >= 8) {
      a.class_cataphract = true;
      this.addNotification('Class Unlocked: Cataphract!');
    }
    // Defeat Fog Weaver → Arcania
    if (!a.class_arcania && (s.enemiesKilled && (s.enemiesKilled['fog_weaver'] || 0) >= 1)) {
      a.class_arcania = true;
      this.addNotification('Class Unlocked: Arcania!');
    }
    // Defeat Thusnelda → Wulfswestr
    if (!a.class_wulfswestr && (s.enemiesKilled && (s.enemiesKilled['thusnelda'] || 0) >= 1)) {
      a.class_wulfswestr = true;
      this.addNotification('Class Unlocked: Wulfswestr!');
    }
    // Win a boss fight with no downed → Praetorian
    if (!a.class_praetorian && a._bossFlawless) {
      a.class_praetorian = true;
      this.addNotification('Class Unlocked: Praetorian!');
    }
    // Win full run → Vestalis
    if (!a.class_vestalis && (s.runsCompleted || 0) >= 1) {
      a.class_vestalis = true;
      this.addNotification('Class Unlocked: Vestalis!');
    }

    this.saveAchievements();
  }

  // Track flawless boss kill (no units downed during boss fight)
  trackBossFlawless() {
    if (this.engine.hasBossEnemy() && !this.engine.party.some(u => u.downed)) {
      this.achievements._bossFlawless = true;
    }
  }

  addNotification(text) {
    console.log('[ACHIEVEMENT] ' + text);
    // Show toast popup
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<span class="achievement-toast-icon">★</span> ${text}`;
    document.getElementById('game').appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 600);
    }, 3000);
  }

  showAchievementsScreen() {
    this.ui.showScreen('achievements-screen');
    const content = document.getElementById('achievements-content');
    const a = this.achievements;
    const s = this.stats;

    const ACHIEVEMENT_DEFS = [
      // Regular bosses (3 kills)
      { key: 'boss_arminius_champion_x3', name: "Warlord Slayer", desc: "Defeat the Germanic Warlord 3 times.", progress: () => Math.min(3, s.enemiesKilled['arminius_champion'] || 0) + '/3' },
      { key: 'boss_grove_witch_x3', name: "Witch Hunter", desc: "Defeat the Grove Witch 3 times.", progress: () => Math.min(3, s.enemiesKilled['grove_witch'] || 0) + '/3' },
      { key: 'boss_silent_huntsman_x3', name: "Counter-Sniper", desc: "Defeat the Silent Huntsman 3 times.", progress: () => Math.min(3, s.enemiesKilled['silent_huntsman'] || 0) + '/3' },
      { key: 'boss_serpent_shaman_x3', name: "Serpent Slayer", desc: "Defeat the Serpent Shaman 3 times.", progress: () => Math.min(3, s.enemiesKilled['serpent_shaman'] || 0) + '/3' },
      { key: 'boss_mire_mother_x3', name: "Beast Tamer", desc: "Defeat the Mire Mother 3 times.", progress: () => Math.min(3, s.enemiesKilled['mire_mother'] || 0) + '/3' },
      { key: 'boss_bone_speaker_x3', name: "Silence the Dead", desc: "Defeat the Bone Speaker 3 times.", progress: () => Math.min(3, s.enemiesKilled['bone_speaker'] || 0) + '/3' },
      { key: 'boss_fog_weaver_x3', name: "Fog Cutter", desc: "Defeat the Fog Weaver 3 times.", progress: () => Math.min(3, s.enemiesKilled['fog_weaver'] || 0) + '/3' },
      { key: 'boss_blood_stag_x3', name: "Stag Hunter", desc: "Defeat the Blood Stag 3 times.", progress: () => Math.min(3, s.enemiesKilled['blood_stag'] || 0) + '/3' },
      // Story bosses (1 kill, hidden)
      { key: 'boss_corpse_arminius', name: "The Betrayer Falls", desc: "Defeat the Corpse of Arminius.", hidden: true, progress: () => a.boss_corpse_arminius ? 'Done' : '0/1' },
      { key: 'boss_corpse_varus', name: "Varus Redeemed", desc: "Defeat the Corpse of Varus.", hidden: true, progress: () => a.boss_corpse_varus ? 'Done' : '0/1' },
      { key: 'boss_spirits_defeated', name: "The Forest Is Silenced", desc: "Defeat the Spirits of Arminius and Varus.", hidden: true, progress: () => a.boss_spirits_defeated ? 'Done' : '0/1' },
      { key: 'boss_ariovistus', name: "King Breaker", desc: "Defeat the Revenant of Ariovistus.", hidden: true, progress: () => a.boss_ariovistus ? 'Done' : '0/1' },
      // Equipment achievements — Rare
      { key: 'hero_three_rares', name: "Collector", desc: "Have one hero equipped with 3 rare items.", progress: () => a.hero_three_rares ? 'Done' : 'Not yet' },
      { key: 'hero_only_rares', name: "Gilded Warrior", desc: "Have one hero with only rare equipment.", progress: () => a.hero_only_rares ? 'Done' : 'Not yet' },
      { key: 'party_all_rares', name: "Legion of Gold", desc: "Entire party equipped with only rare items.", progress: () => a.party_all_rares ? 'Done' : 'Not yet' },
      // Equipment achievements — Epic
      { key: 'hero_first_epic', name: "Relic Hunter", desc: "Equip your first epic item.", progress: () => a.hero_first_epic ? 'Done' : 'Not yet' },
      { key: 'hero_three_epics', name: "Relic Hoarder", desc: "Have one hero equipped with 3 epic items.", progress: () => a.hero_three_epics ? 'Done' : 'Not yet' },
      { key: 'hero_only_epics', name: "Demigod", desc: "Have one hero with only epic equipment.", progress: () => a.hero_only_epics ? 'Done' : 'Not yet' },
      { key: 'party_all_epics', name: "Pantheon", desc: "Entire party equipped with only epic items.", progress: () => a.party_all_epics ? 'Done' : 'Not yet' },
    ];

    let html = '';
    ACHIEVEMENT_DEFS.forEach(def => {
      const unlocked = !!a[def.key];
      // Hidden achievements: don't show until unlocked
      if (def.hidden && !unlocked) {
        html += `<div class="achievement-slot locked hidden-achievement">
          <div class="achievement-name">???</div>
          <div class="achievement-desc">Hidden achievement</div>
          <div class="achievement-progress">???</div>
        </div>`;
        return;
      }
      const curse = CURSE_DEFS.find(c => c.achievement === def.key);
      const boon = BOON_DEFS.find(b => b.achievement === def.key);
      const unlockText = curse
        ? `<div class="achievement-unlock" style="color:var(--red-bright)">Unlocks curse: ${curse.name}</div>`
        : boon
        ? `<div class="achievement-unlock" style="color:var(--green-bright)">Unlocks boon: ${boon.name}</div>`
        : '';
      html += `<div class="achievement-slot ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-name">${unlocked ? '&#9733; ' : ''}${def.name}</div>
        <div class="achievement-desc">${def.desc}</div>
        ${unlockText}
        <div class="achievement-progress">${def.progress()}</div>
      </div>`;
    });

    content.innerHTML = html;
  }

  // --- Run management ---
  startNewRun() {
    this.clearSavedRun();
    this.difficulty = 1;
    this.marchCount = 0;
    this.recentBosses = [];
    this.usedRunEventIds = new Set();
    this._leaderboardSaved = false;
    this.currentRunRenown = 0;
    // Boon: Spirit's Peace — start at 60 morale
    this.engine.morale = this.activeBoons.includes('spirits_peace') ? 60 : 50;
    this.engine.totalEnemiesKilled = 0;
    this.engine.encountersCompleted = 0;
    this.engine.totalRenownEarned = 0;
    this.engine.pendingSkillPicks = 0;
    this.engine.skillUsageStats = {};
    this.engine.runKilledBosses = [];
    this.engine.difficulty = this.difficulty;

    // Use selected party or fallback to defaults
    const partyClasses = this.selectedPartyClasses.length === 3
      ? [...this.selectedPartyClasses]
      : ['legionary', 'centurion', 'medicus'];
    this.engine.initParty(partyClasses);

    // Boon: King's Hoard — start with a random uncommon item
    if (this.activeBoons.includes('kings_hoard')) {
      const uncommons = Object.values(ITEM_DATA).filter(i => i.rarity === 'uncommon' && this.engine.party.some(u => canEquipItem(u, i)));
      if (uncommons.length > 0) {
        const item = uncommons[Math.floor(Math.random() * uncommons.length)];
        const eligible = this.engine.party.filter(u => canEquipItem(u, item));
        if (eligible.length > 0) {
          this.engine.equipItem(eligible[0].index, item.id);
        }
      }
    }

    this.startGameplayMusic();

    this.ui.mapNodes = generateMap(this.difficulty, this.recentBosses, this.usedRunEventIds);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui._mapTerrainSeed = Math.floor(Math.random() * 100000);
    this.showMarchTitleCard();
  }

  continueRun() {
    this.difficulty++;
    this.marchCount++;
    this.engine.difficulty = this.difficulty;

    this.resumeGameplayMusic();

    this.ui.mapNodes = generateMap(this.difficulty, this.recentBosses, this.usedRunEventIds);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui._mapTerrainSeed = Math.floor(Math.random() * 100000);
    this.showMarchTitleCard();
  }

  showMarchTitleCard() {
    const theme = MARCH_THEMES[this.difficulty] || { name: `March ${this.difficulty}`, subtitle: 'Deeper into the forest.', theme: 'forest' };

    // Apply theme to map screen
    const mapScreen = document.getElementById('map-screen');
    mapScreen.dataset.theme = theme.theme;

    const splash = document.createElement('div');
    splash.className = 'march-title-card';
    splash.innerHTML = `
      <div class="march-title-content">
        <div class="march-title-march">MARCH ${this.difficulty}</div>
        <div class="march-title-name">${theme.name}</div>
        <div class="march-title-subtitle">${theme.subtitle}</div>
      </div>
    `;
    document.getElementById('game').appendChild(splash);

    // Play march theme music if available (then fall back to random rotation)
    if (this.settings.fullSoundtrack && theme.music) {
      if (this.currentTrack) this.stopTrack(this.currentTrack, 800);
      this.currentTrack = null;
      setTimeout(() => {
        this.currentTrack = this.playTrack(theme.music, false);
        this.musicMode = 'gameplay';
        this.musicStarted = true;
      }, 900);
    }

    // Preload enemy portraits for this march's encounters during the splash
    if (this.settings.reducedArt) {
      // Only preload the 5 category portraits
      preloadImages(Object.values(REDUCED_ART_ENEMY));
    } else {
      const enemyIds = new Set();
      this.ui.mapNodes.forEach(n => {
        if (n.encounter && n.encounter.enemies) {
          n.encounter.enemies.forEach(eid => enemyIds.add(eid));
        }
      });
      preloadImages([...enemyIds].map(eid => `assets/enemy_${eid}.png`));
    }
    preloadImages(['assets/enemy_portrait.png']);

    // Show map behind the card
    this.ui.showMapScreen();

    // Fade out after delay
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 800);
    }, 2500);
  }
}

// Boot
// Reduced art: map class titles to trait-based generic portraits
const REDUCED_ART_PLAYER = {
  'LEG': 'assets/LEG.png', 'EQU': 'assets/LEG.png', 'PRA': 'assets/LEG.png',       // melee → LEG
  'CEN': 'assets/CEN.png', 'SIG': 'assets/CEN.png',                                  // command → CEN
  'MED': 'assets/MED.png', 'COR': 'assets/MED.png',                                   // support → MED
  'SAG': 'assets/SAG.png', 'BAL': 'assets/SAG.png',                                   // ranged → SAG
};

// Reduced art: map enemy IDs to category-based generic portraits
const REDUCED_ART_ENEMY_CATEGORY = {
  // melee
  cheruscan_raider: 'melee', germanic_berserker: 'melee', cheruscan_guardian: 'melee',
  cheruscan_shieldbearer: 'melee', ironbound_champion: 'melee', cursed_warrior: 'melee',
  death_champion: 'melee', barrow_guardian: 'melee', plague_bearer: 'melee',
  // ranged
  sling_hunter: 'ranged', spear_thrower: 'ranged', shadow_stalker: 'ranged', raven_caller: 'ranged',
  // caster
  bog_seer: 'caster', runecarver: 'caster', blood_druid: 'caster', elder_seer: 'caster',
  forest_wraith: 'caster', fog_illusion: 'caster', serpent_shade: 'caster',
  // monster
  marsh_wolf: 'monster', fen_viper: 'monster', mire_leech: 'monster', war_hound: 'monster',
  boar_youngling: 'monster', war_boar: 'monster', ironhide_boar: 'monster',
  wicker_man: 'monster', oak_shield: 'monster',
  // boss
  arminius_champion: 'boss', grove_witch: 'boss', silent_huntsman: 'boss',
  serpent_shaman: 'boss', mire_mother: 'boss', bone_speaker: 'boss',
  fog_weaver: 'boss', blood_stag: 'boss', corpse_of_arminius: 'boss',
  corpse_of_varus: 'boss', spirit_of_arminius: 'boss', spirit_of_varus: 'boss',
  revenant_of_ariovistus: 'boss', healing_totem: 'monster', bone_totem: 'monster',
};
const REDUCED_ART_ENEMY = {
  melee: 'assets/enemy_cheruscan_raider.png',
  ranged: 'assets/enemy_sling_hunter.png',
  caster: 'assets/enemy_bog_seer.png',
  monster: 'assets/enemy_marsh_wolf.png',
  boss: 'assets/enemy_arminius_champion.png',
};

function getPlayerPortrait(classTitle) {
  if (window.game && window.game.settings.reducedArt) {
    return REDUCED_ART_PLAYER[classTitle] || `assets/${classTitle}.png`;
  }
  return `assets/${classTitle}.png`;
}

function getEnemyPortrait(enemyId) {
  if (window.game && window.game.settings.reducedArt) {
    const cat = REDUCED_ART_ENEMY_CATEGORY[enemyId] || 'melee';
    return REDUCED_ART_ENEMY[cat] || 'assets/enemy_portrait.png';
  }
  return `assets/enemy_${enemyId}.png`;
}

function isFastMode() {
  return window.game && window.game.settings && window.game.settings.fastMode;
}

// Preload images into browser cache
function preloadImages(srcs) {
  srcs.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadGameData();
  window.game = new Game();

  // Preload map icons on boot so they're cached before the first march
  preloadImages([
    'assets/map-icons/bossFight.png', 'assets/map-icons/camp.png',
    'assets/map-icons/easyEncounter.png', 'assets/map-icons/mediumEncounter.png',
    'assets/map-icons/hardEncounter.png', 'assets/map-icons/event.png',
    'assets/map-icons/merchant.png', 'assets/map-icons/skillTeacher.png',
    'assets/map-icons/smith.png',
  ]);

  // Preload all unit portraits
  preloadImages([
    'assets/LEG.png', 'assets/CEN.png', 'assets/MED.png',
    'assets/SAG.png', 'assets/SIG.png', 'assets/COR.png',
    'assets/EQU.png', 'assets/BAL.png', 'assets/PRA.png',
  ]);
});
