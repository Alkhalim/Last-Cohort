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
    this.engine.encounterIndex = 0;
    this.engine.morale = 50;
    this.engine.initParty(['legionary', 'centurion', 'medicus']);
    this.startNextEncounter();
  }

  startNextEncounter() {
    const encounter = ENCOUNTERS[this.engine.encounterIndex];
    this.engine.initEncounter(encounter);
    this.ui.showScreen('combat-screen');
    this.ui.selectedDieId = null;
    this.ui.selectedUnitIndex = null;
    this.ui.render();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
