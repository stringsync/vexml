/**
 * A generic utility for tracking a metric across scopes.
 */
export class Budget {
  private amount = 0;

  constructor(initial: number) {
    this.amount = initial;
  }

  static unlimited() {
    return new Budget(Infinity);
  }

  isUnlimited(): boolean {
    return this.amount === Infinity;
  }

  remaining(): number {
    return this.amount;
  }

  spend(amount: number): void {
    this.amount -= amount;
  }
}
