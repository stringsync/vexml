/** Represents a mixed fraction. */
export type MixedFraction = {
  whole: number;
  remainder: Fraction;
};

/**
 * Represents the sign of a fraction.
 *
 * 0, -0, +0 have a sign of '/'.
 */
export type FractionSign = '+' | '-' | '/';

/**
 * Represents a mathematical fraction with a numerator and a denominator.
 *
 * The `Fraction` class provides methods for basic arithmetic operations such as addition, subtraction, multiplication,
 * and division, as well as utility methods for comparing, simplifying, and converting fractions.
 *
 * Caveats:
 *   - The denominator should never be zero. If attempted, an error will be thrown.
 *   - Arithmetic methods return a new `Fraction` instance without modifying the original instance.
 *   - Simplification is applied automatically where applicable.
 */
export class Fraction {
  constructor(public readonly numerator: number, public readonly denominator: number = 1) {
    if (this.denominator === 0) {
      throw new Error('denominator cannot be zero');
    }
    if (!Number.isInteger(this.numerator)) {
      throw new Error('numerator must be an integer, try Fraction.fromDecimal instead');
    }
    if (!Number.isInteger(this.denominator)) {
      throw new Error('denominator must be an integer, try Fraction.fromDecimal instead');
    }
  }

  /**
   * Creates a fraction from a decimal number.
   *
   * NOTE: Integers work too.
   */
  static fromDecimal(decimal: number): Fraction {
    const len = (decimal.toString().split('.')[1] || '').length;
    const denominator = 10 ** len;
    return new Fraction(decimal * denominator, denominator).simplify();
  }

  /** Creates a fraction from a mixed fraction. */
  static fromMixed(mixed: MixedFraction): Fraction {
    const denominator = mixed.remainder.denominator;
    return new Fraction(mixed.whole * denominator, denominator).add(mixed.remainder);
  }

  /** Returns the decimal of the fraction. */
  toDecimal(): number {
    return this.numerator / this.denominator;
  }

  /** Returns the fraction in mixed form. */
  toMixed(): MixedFraction {
    const whole = Math.floor(this.numerator / this.denominator);
    const remainder = new Fraction(this.numerator % this.denominator, this.denominator).simplify();
    return { whole, remainder };
  }

  /** Returns the sign of the fraction. */
  sign(): FractionSign {
    const decimal = this.toDecimal();
    if (decimal === 0) {
      return '/';
    } else if (decimal > 0) {
      return '+';
    } else {
      return '-';
    }
  }

  /** Returns whether the other fraction is equal to this fraction.  */
  isEqual(value: Fraction): boolean {
    const v1 = this.simplify();
    const v2 = value.simplify();
    return v1.numerator === v2.numerator;
  }

  /** Reduces the numerator and denominator to its lowest common factor. */
  simplify(): Fraction {
    const gcd = this.gcd(this.numerator, this.denominator);
    return new Fraction(this.numerator / gcd, this.denominator / gcd);
  }

  /** Returns the sum as a new fraction. */
  add(value: Fraction): Fraction {
    const commonDenominator = this.denominator * value.denominator;
    const newNumerator = this.numerator * value.denominator + value.numerator * this.denominator;
    return new Fraction(newNumerator, commonDenominator).simplify();
  }

  /** Returns the difference as a new fraction. */
  subtract(value: Fraction): Fraction {
    return this.add(new Fraction(-value.numerator, value.denominator));
  }

  /** Returns the product as a new fraction. */
  multiply(value: Fraction): Fraction {
    return new Fraction(this.numerator * value.numerator, this.denominator * value.denominator).simplify();
  }

  /** Returns the quotient as a new fraction. */
  divide(value: Fraction): Fraction {
    return this.multiply(value.reciprocate());
  }

  /** Returns the reciprocal a new fraction. */
  reciprocate(): Fraction {
    return new Fraction(this.denominator, this.numerator);
  }

  /** Returns the greatest common denominator. */
  private gcd(a: number, b: number): number {
    return b ? this.gcd(b, a % b) : a;
  }
}
