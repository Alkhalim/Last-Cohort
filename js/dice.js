// ============================================================
// Last Cohort – Dice Pool System
// ============================================================

class DicePool {
  constructor(count = 5) {
    this.count = count;
    this.dice = [];       // { id, value, used, assigned }
    this.adjustUsed = false; // Centurion passive tracking
  }

  roll() {
    this.dice = [];
    this.adjustUsed = false;
    for (let i = 0; i < this.count; i++) {
      this.dice.push({
        id: i,
        value: Math.floor(Math.random() * 6) + 1,
        used: false,
        assigned: null, // { unitIndex, skillId }
      });
    }
    return this.dice;
  }

  getAvailable() {
    return this.dice.filter(d => !d.used);
  }

  getAssigned(unitIndex, skillId) {
    return this.dice.filter(d => d.assigned && d.assigned.unitIndex === unitIndex && d.assigned.skillId === skillId);
  }

  assignDie(dieId, unitIndex, skillId) {
    const die = this.dice.find(d => d.id === dieId);
    if (!die || die.used) return false;
    // Unassign if already assigned elsewhere
    if (die.assigned) {
      die.assigned = null;
    }
    die.assigned = { unitIndex, skillId };
    return true;
  }

  unassignDie(dieId) {
    const die = this.dice.find(d => d.id === dieId);
    if (!die) return false;
    die.assigned = null;
    return true;
  }

  useDie(dieId) {
    const die = this.dice.find(d => d.id === dieId);
    if (die) {
      die.used = true;
      die.assigned = null;
    }
  }

  // Centurion passive: adjust die by +/- 1
  adjustDie(dieId, direction) {
    if (this.adjustUsed) return false;
    const die = this.dice.find(d => d.id === dieId);
    if (!die || die.used) return false;
    const newVal = die.value + direction;
    if (newVal < 1 || newVal > 6) return false;
    die.value = newVal;
    this.adjustUsed = true;
    return true;
  }

  // Check if a skill cost is met by given dice
  canPayCost(cost, diceIds) {
    const selected = diceIds.map(id => this.dice.find(d => d.id === id)).filter(Boolean);
    if (selected.some(d => d.used)) return false;

    switch (cost.type) {
      case 'any':
        return selected.length === 1;
      case 'threshold':
        return selected.length === 1 && selected[0].value >= cost.min;
      case 'range':
        return selected.length === 1 && selected[0].value >= cost.min && selected[0].value <= cost.max;
      case 'exact':
        return selected.length === 1 && selected[0].value === cost.val;
      case 'combined':
        if (selected.length !== cost.dice) return false;
        return selected.reduce((sum, d) => sum + d.value, 0) >= cost.min;
      case 'combinedExact':
        if (selected.length !== cost.dice) return false;
        return selected.reduce((sum, d) => sum + d.value, 0) === cost.val;
      default:
        return false;
    }
  }
}
