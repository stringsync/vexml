import { Fraction } from '@/util/fraction';

describe(Fraction, () => {
  describe('fromDecimal', () => {
    it.todo('creates fraction from a decimal');

    it.todo('creates a fraction from an integer');

    it.todo('creates a fraction from 0');

    it.todo('creates a fraction with a decimal less than 1');

    it.todo('creates a fraction with a decimal greater than 1');

    it.todo('creates a fraction with a negative number');
  });

  describe('toDecimal', () => {
    it.todo('converts the fraction to a decimal number');

    it.todo('converts a negative fraction to a negative decimal number');
  });

  describe('isEqual', () => {
    it.todo('returns true when both fractions have the same numerator and denominator');

    it.todo('returns false when the fractions are different values');

    it.todo('returns true when the fractions simplify to the same value');
  });

  describe('simplify', () => {
    it.todo('returns a simplified fraction');

    it.todo('returns a fraction with the same value if its already simplified');

    it.todo('simplifies whole numbers to 1 / 1');
  });

  describe('add', () => {
    it.todo('adds fractions');
  });

  describe('subtract', () => {
    it.todo('subtracts fractions');
  });

  describe('multiply', () => {
    it.todo('multiplies fractions');
  });

  describe('divide', () => {
    it.todo('divides fractions');
  });

  describe('reciprocate', () => {
    it.todo('reciprocates fractions');

    it.todo('preserves negative numbers', () => {});
  });
});
