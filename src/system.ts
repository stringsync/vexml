import { Stave } from './stave';

/**
 * A wrapper that performs operations on a group of staves.
 */
export class System {
  private staves = new Array<Stave>();
  private measureNumber = 1;

  /** Returns the staves of the system. */
  getStaves(): Stave[] {
    return this.staves;
  }

  /** Adds a stave to the system. */
  addStave(stave: Stave): this {
    this.staves.push(stave);
    return this;
  }

  /** Returns the width of the system. */
  getWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getWidth()));
  }

  /** Sets the width of the system. */
  setWidth(width: number): this {
    for (const stave of this.staves) {
      stave.setWidth(width);
    }
    return this;
  }

  /** Sets the X coordinate of the system. */
  setX(x: number): this {
    for (const stave of this.staves) {
      stave.setX(x);
    }
    return this;
  }

  /** Sets the Y coordinate of the system. */
  setY(y: number): this {
    for (const stave of this.staves) {
      stave.setY(y);
    }
    return this;
  }

  /** Returns the justify width of the system. */
  getJustifyWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getJustifyWidth()));
  }

  /** Returns the modifiers width of the system. */
  getModifiersWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getModifiersWidth()));
  }

  /** Returns the first stave of the system. */
  getFirstStave(): Stave | undefined {
    return this.staves[0];
  }

  /** Returns the last stave of the system. */
  getLastStave(): Stave | undefined {
    return this.staves[this.staves.length - 1];
  }

  /** Sets the measure number of the system. */
  setMeasureNumber(measureNumber: number): this {
    this.measureNumber = measureNumber;
    return this;
  }

  /** Returns the measure number of the system. */
  getMeasureNumber(): number {
    return this.measureNumber;
  }
}
