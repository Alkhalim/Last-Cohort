// ============================================================
// Last Cohort – Main Entry Point
// ============================================================

class Game {
  constructor() {
    this.engine = new CombatEngine();
    this.ui = new GameUI(this.engine);
    this.bindStartScreen();
  }

  bindStartScreen() {
    document.getElementById('btn-start').addEventListener('click', () => {
      this.startNewRun();
    });
  }

  startNewRun() {
    this.engine.morale = 50;
    this.engine.initParty(['legionary', 'centurion', 'medicus']);

    // Generate map
    this.ui.mapNodes = generateMap();
    this.ui.currentNodeId = null;

    // Show map screen
    this.ui.showMapScreen();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
