import * as util from '@/util';

/**
 * A generic utility for tracking a metric across scopes.
 */
export class Budget {
  private remaining = 0;

  constructor(initial: number) {
    this.remaining = initial;
  }

  static unlimited() {
    return new Budget(Infinity);
  }

  isUnlimited(): boolean {
    return this.remaining === Infinity;
  }

  getRemaining(): number {
    return this.remaining;
  }

  spend(amount: number): void {
    util.assert(this.remaining >= amount, 'budget exceeded');
    this.remaining -= amount;
  }
}
