import * as vexflow from 'vexflow';

/** Wrapper around vexflow.Factory to expose protected properties. */
export class Factory extends vexflow.Factory {
  /** Returns all the systems that were made. */
  getSystems(): vexflow.System[] {
    return [...this.systems];
  }

  /** Returns the last system that was made. Defaults to null. */
  getCurrentSystem(): vexflow.System | null {
    return this.systems[this.systems.length - 1] ?? null;
  }

  /** Returns the second-to-last system that was made. Defaults to null. */
  getPreviousSystem(): vexflow.System | null {
    return this.systems[this.systems.length - 2] ?? null;
  }
}
