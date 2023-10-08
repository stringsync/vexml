import { clamp, gcd, lcm, max, sum } from '@/util';

describe('math', () => {
  describe('max', () => {
    it('returns the max of the array', () => {
      const result = max([1, 2, 3]);
      expect(result).toBe(3);
    });

    it('returns 0 as the max if initial is not specified', () => {
      const result = max([]);
      expect(result).toBe(0);
    });

    it('returns initial if there are no values', () => {
      const result = max([], 42);
      expect(result).toBe(42);
    });

    it('returns initial if it is greater than all values', () => {
      const result = max([1, 2, 3], 42);
      expect(result).toBe(42);
    });
  });

  describe('clamp', () => {
    it('returns the value if within the range', () => {
      const result = clamp(1, 3, 2);
      expect(result).toBe(2);
    });

    it('returns min if the number is less than it', () => {
      const result = clamp(1, 3, -1);
      expect(result).toBe(1);
    });

    it('returns max if the number is greater than it', () => {
      const result = clamp(1, 3, 4);
      expect(result).toBe(3);
    });

    it('throws when min is greater than max', () => {
      expect(() => clamp(3, 1, 2)).toThrow();
    });
  });

  describe('sum', () => {
    it('returns the sum of the array', () => {
      const result = sum([1, 2, 3]);
      expect(result).toBe(6);
    });

    it('returns 0 as the sum if initial is not specified', () => {
      const result = sum([]);
      expect(result).toBe(0);
    });

    it('returns initial if there are no values', () => {
      const result = sum([], 42);
      expect(result).toBe(42);
    });
  });

  describe('gcd', () => {
    it.each([
      { a: 8, b: 12, expectation: 4 },
      { a: 14, b: 28, expectation: 14 },
      { a: 21, b: 14, expectation: 7 },
      { a: -4, b: 14, expectation: 2 },
      { a: 28, b: 0, expectation: 28 },
    ])('computes the greatest common divisor', (t) => {
      const result = gcd(t.a, t.b);
      expect(result).toBe(t.expectation);
    });
  });

  describe('lcm', () => {
    it.each([
      { a: 8, b: 12, expectation: 24 },
      { a: 14, b: 28, expectation: 28 },
      { a: 21, b: 14, expectation: 42 },
      { a: -4, b: 14, expectation: -28 },
      { a: 28, b: 0, expectation: 0 },
    ])('computes the least common multiple', (t) => {
      const result = lcm(t.a, t.b);
      expect(result).toBe(t.expectation);
    });
  });
});
