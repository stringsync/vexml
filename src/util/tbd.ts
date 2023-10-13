/**
 * Represents a constant to be determined (TBD) at a later time.
 *
 * Use this class when you have the following requirements:
 *   - The initial value may be needed at any time.
 *   - The final value must be set exactly once before it's read.
 */
export class Tbd<T> {
  private initial: T;
  private final: T | undefined;
  private isFinalized: boolean;

  constructor(initial: T) {
    this.initial = initial;
    this.final = undefined;
    this.isFinalized = false;
  }

  /** Returns the initial value. */
  getInitial(): T {
    return this.initial;
  }

  /**
   * Returns the final value.
   *
   * Throws if the final value was never set.
   */
  getFinal(): T {
    if (!this.isFinalized) {
      throw new Error('cannot get final value of a tbd that is not finalized');
    }
    return this.final!;
  }

  /**
   * Sets the final value.
   *
   * Throws if the final value was already set.
   */
  setFinal(final: T): void {
    if (this.isFinalized) {
      throw new Error('cannot set final value of an already-finalized tbd');
    }
    this.final = final;
    this.isFinalized = true;
  }

  /** Returns a new Tbd with the same initial value set. */
  reinitialize(): Tbd<T> {
    return new Tbd(this.initial);
  }
}
