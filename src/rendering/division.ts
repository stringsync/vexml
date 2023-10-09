import { Fraction } from '@/util';

/**
 * Encapsulates the concept of musical timing subdivisions within a measure.
 *
 * The `Division` class provides a unified way to manage and manipulate musical divisions, ensuring consistent
 * representations and operations upon them.
 *
 * While it delegates most of its methods to the `Fraction` class, the main purpose of `Division` is to limit the
 * scope of the `Fraction` class and provide meaningful labels to the value.
 */
export class Division {
  private constructor(private fraction: Fraction) {}

  /**
   * Creates a Division.
   *
   * @param divisions The number of divisions.
   * @param quarterNoteDivisions The number of divisions that correspond to a quarter note.
   */
  static of(divisions: number, quarterNoteDivisions: number): Division {
    const fraction = new Fraction(divisions, quarterNoteDivisions);
    return new Division(fraction);
  }

  /** Returns if the other divisions is equal to this. */
  isEqual(value: Division): boolean {
    return this.fraction.isEquivalent(value.fraction);
  }

  /** Returns the sum as a new Division. */
  add(value: Division) {
    const fraction = this.fraction.add(value.fraction);
    return new Division(fraction);
  }

  /** Returns the difference as a new Division. */
  subtract(value: Division) {
    const fraction = this.fraction.subtract(value.fraction);
    return new Division(fraction);
  }

  /** Returns the number of beats (quarter notes). */
  toBeats(): number {
    return this.fraction.toDecimal();
  }
}
