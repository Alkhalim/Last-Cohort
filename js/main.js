// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

const RENOWN_STORAGE_KEY = 'lastCohort_renown';
const SETTINGS_STORAGE_KEY = 'lastCohort_settings';

class Game {
  constructor() {
    this.engine = new CombatEngine();
    this.ui = new GameUI(this.engine);
    this.lifetimeRenown = this.loadLifetimeRenown();
    this.settings = this.loadSettings();
    this.difficulty = 1;
    this.marchCount = 0;
    this.music = null;
    this.musicStarted = false;
    this.showHomeScreen();
    this.bindStartScreen();
    this.bindMenuButtons();
  }

  // --- Settings persistence ---
  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { musicVolume: 35, soundVolume: 70 };
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  // --- Music ---
  initMusic() {
    if (this.music) return;
    this.music = new Audio('assets/music.mp3');
    this.music.loop = true;
    this.music.volume = this.settings.musicVolume / 100;
  }

  startMusic() {
    if (this.musicStarted) return;
    this.initMusic();
    this.music.play().then(() => {
      this.musicStarted = true;
    }).catch(() => {});
  }

  setMusicVolume(val) {
    this.settings.musicVolume = val;
    if (this.music) this.music.volume = val / 100;
    this.saveSettings();
  }

  setSoundVolume(val) {
    this.settings.soundVolume = val;
    this.saveSettings();
  }

  loadLifetimeRenown() {
    try {
      const stored = localStorage.getItem(RENOWN_STORAGE_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  saveLifetimeRenown() {
    try {
      localStorage.setItem(RENOWN_STORAGE_KEY, String(this.lifetimeRenown));
    } catch (e) {}
  }

  addRunRenown(amount) {
    this.lifetimeRenown += amount;
    this.saveLifetimeRenown();
  }

  showHomeScreen() {
    this.ui.showScreen('title-screen');
    const renownEl = document.getElementById('home-renown-value');
    if (renownEl) renownEl.textContent = this.lifetimeRenown;
  }

  returnHome() {
    this.showHomeScreen();
  }

  bindStartScreen() {
    document.getElementById('btn-start').addEventListener('click', () => {
      this.startMusic();
      this.startNewRun();
    });
  }

  bindMenuButtons() {
    // Unlocks button
    document.getElementById('btn-unlocks').addEventListener('click', () => {
      this.ui.showScreen('unlocks-screen');
      const renownEl = document.getElementById('unlocks-renown-value');
      if (renownEl) renownEl.textContent = this.lifetimeRenown;
    });
    document.getElementById('btn-unlocks-back').addEventListener('click', () => {
      this.showHomeScreen();
    });

    // Options button
    document.getElementById('btn-options').addEventListener('click', () => {
      this.showOptionsScreen();
    });
    document.getElementById('btn-options-back').addEventListener('click', () => {
      this.showHomeScreen();
    });

    // Volume sliders
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

  showOptionsScreen() {
    this.ui.showScreen('options-screen');
    // Sync sliders to current settings
    document.getElementById('opt-music-vol').value = this.settings.musicVolume;
    document.getElementById('opt-music-val').textContent = this.settings.musicVolume + '%';
    document.getElementById('opt-sound-vol').value = this.settings.soundVolume;
    document.getElementById('opt-sound-val').textContent = this.settings.soundVolume + '%';
  }

  startNewRun() {
    this.difficulty = 1;
    this.marchCount = 0;
    this.engine.morale = 50;
    this.engine.totalEnemiesKilled = 0;
    this.engine.encountersCompleted = 0;
    this.engine.totalRenownEarned = 0;
    this.engine.partyXp = 0;
    this.engine.partyLevel = 1;
    this.engine.pendingLevelUps = 0;
    this.engine.difficulty = this.difficulty;
    this.engine.initParty(['legionary', 'centurion', 'medicus']);

    this.ui.mapNodes = generateMap(this.difficulty);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui.showMapScreen();
  }

  // Continue deeper into the forest after boss victory — keep party, increase difficulty
  continueRun() {
    this.difficulty++;
    this.marchCount++;
    this.engine.difficulty = this.difficulty;

    // Generate a new harder map
    this.ui.mapNodes = generateMap(this.difficulty);
    this.ui.currentNodeId = null;
    this.ui.difficulty = this.difficulty;
    this.ui.showMapScreen();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
