import { Fraction } from '@/util/fraction';

describe(Fraction, () => {
  describe('constructor', () => {
    it('creates fractions', () => {
      const fraction = new Fraction(1, 2);
      expect(fraction.toDecimal()).toBe(0.5);
    });

    it('defaults the denominator to 1', () => {
      const fraction = new Fraction(5);
      expect(fraction.toDecimal());
    });

    it('allows 0 in the numerator', () => {
      const fraction = new Fraction(0, 1);
      expect(fraction.toDecimal()).toBe(0);
    });

    it('disallows 0 in the denominator', () => {
      expect(() => new Fraction(1, 0)).toThrow();
    });

    it('disallows a non-integer in the numerator', () => {
      expect(() => new Fraction(1.5)).toThrow();
    });

    it('disallows a non-integer in the denominator', () => {
      expect(() => new Fraction(1, 1.5)).toThrow();
    });
  });

  describe('fromDecimal', () => {
    it('creates fraction from a decimal', () => {
      const fraction = Fraction.fromDecimal(0.5);
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(2);
    });

    it('creates a fraction from an integer', () => {
      const fraction = Fraction.fromDecimal(5);
      expect(fraction.numerator).toBe(5);
      expect(fraction.denominator).toBe(1);
    });

    it('creates a fraction from 0', () => {
      const fraction = Fraction.fromDecimal(0);
      expect(fraction.numerator).toBe(0);
      expect(fraction.denominator).toBe(1);
    });

    it('creates a fraction with a decimal greater than 1', () => {
      const fraction = Fraction.fromDecimal(1.5);
      expect(fraction.numerator).toBe(3);
      expect(fraction.denominator).toBe(2);
    });

    it('creates a fraction with a negative number', () => {
      const fraction = Fraction.fromDecimal(-0.125);
      expect(Math.abs(fraction.numerator)).toBe(1);
      expect(Math.abs(fraction.denominator)).toBe(8);
      expect(fraction.sign()).toBe('-');
    });
  });

  describe('toDecimal', () => {
    it('converts the fraction to a decimal number', () => {
      const fraction = new Fraction(1, 2);
      expect(fraction.toDecimal()).toBe(0.5);
    });

    it('converts a negative fraction to a negative decimal number', () => {
      const fraction = new Fraction(-1, 2);
      expect(fraction.toDecimal()).toBe(-0.5);
    });

    it('is the inverse operation of fromDecimal', () => {
      const decimal = 0.361;
      const fraction = Fraction.fromDecimal(decimal);
      expect(fraction.toDecimal()).toBe(decimal);
    });
  });

  describe('sign', () => {
    it(`returns '+' when both numerator and denominator are positive`, () => {
      const fraction = new Fraction(1, 2);
      expect(fraction.sign()).toBe('+');
    });

    it(`returns '-' when only the numerator is negative`, () => {
      const fraction = new Fraction(-1, 2);
      expect(fraction.sign()).toBe('-');
    });

    it(`returns '-' when only the denominator is negative`, () => {
      const fraction = new Fraction(1, -2);
      expect(fraction.sign()).toBe('-');
    });

    it(`returns '+' when both numerator and denominator are negative`, () => {
      const fraction = new Fraction(-1, -2);
      expect(fraction.sign()).toBe('+');
    });
  });

  describe('isEqual', () => {
    it('returns true when both fractions have the same numerator and denominator', () => {
      const fraction1 = new Fraction(1, 2);
      const fraction2 = new Fraction(1, 2);
      expect(fraction1.isEqual(fraction2)).toBeTrue();
    });

    it('returns false when the fractions are different values', () => {
      const fraction1 = new Fraction(1, 2);
      const fraction2 = new Fraction(1, 2);
      expect(fraction1.isEqual(fraction2)).toBeTrue();
    });

    it('returns true when the fractions simplify to the same value', () => {
      const fraction1 = new Fraction(1, 2);
      const fraction2 = new Fraction(2, 4);
      expect(fraction1.isEqual(fraction2)).toBeTrue();
    });
  });

  describe('simplify', () => {
    it('returns a simplified fraction', () => {
      const fraction = new Fraction(2, 4).simplify();
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(2);
    });

    it('returns a fraction with the same value if its already simplified', () => {
      const fraction = new Fraction(1, 2).simplify();
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(2);
    });

    it('simplifies whole numbers', () => {
      const fraction = new Fraction(42).simplify();
      expect(fraction.numerator).toBe(42);
      expect(fraction.denominator).toBe(1);
    });
  });

  describe('add', () => {
    it('adds fractions', () => {
      const fraction = new Fraction(1, 2).add(new Fraction(1, 2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(1);
    });

    it('simplifies the result', () => {
      const fraction = new Fraction(2, 2).add(new Fraction(2, 2));
      expect(fraction.numerator).toBe(2);
      expect(fraction.denominator).toBe(1);
    });
  });

  describe('subtract', () => {
    it('subtracts fractions', () => {
      const fraction = new Fraction(2, 2).subtract(new Fraction(1, 2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(2);
    });

    it('simplifies the result', () => {
      const fraction = new Fraction(3, 2).subtract(new Fraction(1, 2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(1);
    });
  });

  describe('multiply', () => {
    it('multiplies fractions', () => {
      const fraction = new Fraction(1, 2).multiply(new Fraction(1, 2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(4);
    });

    it('simplifies the result', () => {
      const fraction = new Fraction(4, 2).multiply(new Fraction(1, 2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(1);
    });
  });

  describe('divide', () => {
    it('divides fractions', () => {
      const fraction = new Fraction(1, 2).divide(new Fraction(2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(4);
    });

    it('simplifies the result', () => {
      const fraction = new Fraction(4, 2).divide(new Fraction(2));
      expect(fraction.numerator).toBe(1);
      expect(fraction.denominator).toBe(1);
    });
  });

  describe('reciprocate', () => {
    it('reciprocates fractions', () => {
      const fraction = new Fraction(1, 2).reciprocate();
      expect(fraction.numerator).toBe(2);
      expect(fraction.denominator).toBe(1);
    });

    it('preserves negative numbers', () => {
      const fraction = new Fraction(-1, 2).reciprocate();
      expect(fraction.numerator).toBe(2);
      expect(fraction.denominator).toBe(-1); // slight implementation leak
    });

    it('does not simplify the result', () => {
      const fraction = new Fraction(2, 4).reciprocate();
      expect(fraction.numerator).toBe(4);
      expect(fraction.denominator).toBe(2);
    });
  });
});
