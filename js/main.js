// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

const RENOWN_STORAGE_KEY = 'lastCohort_renown';

class Game {
  constructor() {
    this.engine = new CombatEngine();
    this.ui = new GameUI(this.engine);
    this.lifetimeRenown = this.loadLifetimeRenown();
    this.difficulty = 1;
    this.marchCount = 0; // how many times we've gone deeper this run
    this.showHomeScreen();
    this.bindStartScreen();
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
      this.startNewRun();
    });
  }

  startNewRun() {
    this.difficulty = 1;
    this.marchCount = 0;
    this.engine.morale = 50;
    this.engine.totalEnemiesKilled = 0;
    this.engine.encountersCompleted = 0;
    this.engine.totalRenownEarned = 0;
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
