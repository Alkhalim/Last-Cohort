// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

const RENOWN_STORAGE_KEY = 'lastCohort_renown';
const SETTINGS_STORAGE_KEY = 'lastCohort_settings';

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

class Game {
  constructor() {
    this.engine = new CombatEngine();
    this.ui = new GameUI(this.engine);
    this.lifetimeRenown = this.loadLifetimeRenown();
    this.settings = this.loadSettings();
    this.difficulty = 1;
    this.marchCount = 0;

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
      this.startNewRun();
    });
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
    this.engine.initParty(['legionary', 'centurion', 'medicus']);

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
