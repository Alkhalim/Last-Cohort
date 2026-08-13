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

  // How many dice a cost consumes. Only 'combined'/'combinedExact' carry an
  // explicit `dice` field, so reading cost.dice directly yields undefined for
  // every other type — which silently disabled the staging cap and let five
  // dice be piled onto a one-die skill.
  static requiredDiceCount(cost) {
    if (!cost) return 1;
    switch (cost.type) {
      case 'combined':
      case 'combinedExact':
        return cost.dice || 2;
      case 'pair':
      case 'pairEven':
      case 'pairOdd':
      case 'oddEven':
      case 'consecutive':
      case 'pairExact6':
        return 2;
      default:
        return 1;
    }
  }

  requiredDiceCount(cost) {
    return DicePool.requiredDiceCount(cost);
  }

  // Can this die ever contribute to paying `cost`, given what is already
  // staged? Rejects dice that could never satisfy the cost on their own terms
  // (wrong value, wrong parity, out of range), so the UI can refuse the click
  // instead of letting the player build an unpayable selection.
  canAcceptDie(cost, stagedIds, die) {
    if (!cost || !die || die.used) return false;
    if (stagedIds.includes(die.id)) return true; // always allow deselect

    const staged = stagedIds
      .map(id => this.dice.find(d => d.id === id))
      .filter(Boolean);
    if (staged.length >= DicePool.requiredDiceCount(cost)) return false;

    switch (cost.type) {
      case 'threshold':
        return die.value >= cost.min;
      case 'range':
        return die.value >= cost.min && die.value <= cost.max;
      case 'exact':
        return die.value === cost.val;
      case 'even':
        return die.value % 2 === 0;
      case 'odd':
        return die.value % 2 === 1;
      case 'pair':
        return staged.length === 0 || staged[0].value === die.value;
      case 'pairEven':
        if (die.value % 2 !== 0) return false;
        return staged.length === 0 || staged[0].value === die.value;
      case 'pairOdd':
        if (die.value % 2 !== 1) return false;
        return staged.length === 0 || staged[0].value === die.value;
      case 'pairExact6':
        return die.value === 6;
      case 'oddEven':
        return staged.length === 0 || staged[0].value % 2 !== die.value % 2;
      case 'consecutive':
        return staged.length === 0 || Math.abs(staged[0].value - die.value) === 1;
      case 'combinedExact': {
        // Reject a die that would overshoot the exact total outright.
        const sum = staged.reduce((s, d) => s + d.value, 0);
        const remaining = DicePool.requiredDiceCount(cost) - staged.length;
        // Every remaining die contributes at least 1.
        return sum + die.value + (remaining - 1) <= cost.val;
      }
      case 'combined':
      case 'any':
      default:
        return true;
    }
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
      case 'even':
        return selected.length === 1 && selected[0].value % 2 === 0;
      case 'odd':
        return selected.length === 1 && selected[0].value % 2 === 1;
      case 'pair':
        return selected.length === 2 && selected[0].value === selected[1].value;
      case 'pairEven':
        return selected.length === 2 && selected[0].value === selected[1].value && selected[0].value % 2 === 0;
      case 'pairOdd':
        return selected.length === 2 && selected[0].value === selected[1].value && selected[0].value % 2 === 1;
      case 'oddEven':
        return selected.length === 2 && selected[0].value % 2 !== selected[1].value % 2;
      case 'consecutive':
        return selected.length === 2 && Math.abs(selected[0].value - selected[1].value) === 1;
      case 'pairExact6':
        return selected.length === 2 && selected[0].value === 6 && selected[1].value === 6;
      default:
        return false;
    }
  }
}
