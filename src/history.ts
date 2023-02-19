/**
 * History tracks a historical value.
 */
export class History<T> {
  private current: T | null = null;
  private previous: T | null = null;

  constructor(initial?: T) {
    this.current = initial ?? null;
  }

  /** Sets the current value. */
  set(value: T): void {
    this.previous = this.current;
    this.current = value;
  }

  /** Gets the current value. */
  getCurrent(): T | null {
    return this.current;
  }

  /** Gets the previous value. */
  getPrevious(): T | null {
    return this.previous;
  }
}
