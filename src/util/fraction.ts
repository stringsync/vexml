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
      throw new Error('Denominator cannot be zero.');
    }
  }

  /**
   * Creates a fraction from a decimal number.
   *
   * NOTE: Integers will work too.
   */
  static fromDecimal(decimal: number): Fraction {
    const len = (decimal.toString().split('.')[1] || '').length;
    const denominator = 10 ** len;
    return new Fraction(decimal * denominator, denominator).simplify();
  }

  /** Returns the decimal of the fraction.*/
  toDecimal(): number {
    return this.numerator / this.denominator;
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
