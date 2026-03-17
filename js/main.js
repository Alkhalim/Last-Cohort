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
    this.currentTrack = null;   // Audio element currently playing
    this.nextTrack = null;      // For crossfade
    this.musicMode = 'none';    // 'menu' | 'gameplay' | 'boss'
    this.musicStarted = false;
    this.fadeInterval = null;

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

  playTrack(src, loop = true) {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = this.getMusicVolume();
    audio.play().catch(() => {});
    // When a non-looping track ends, pick next gameplay track
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
