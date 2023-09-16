import { clamp, max } from '@/util';

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
      expect(() => max(3, 1, 2)).toThrow();
    });
  });
});
