import { NumberRange } from '@/util/numberrange';

describe(NumberRange, () => {
  describe(NumberRange, () => {
    test('should create a valid NumberRange', () => {
      const range = new NumberRange(1, 5);
      expect(range.getStart()).toBe(1);
      expect(range.getEnd()).toBe(5);
    });

    test('should throw an error for invalid range', () => {
      expect(() => new NumberRange(5, 1)).toThrow(
        'Invalid range: left bound must be less than or equal to right bound.'
      );
    });

    test('should include a value within the range', () => {
      const range = new NumberRange(1, 5);
      expect(range.includes(3)).toBe(true);
      expect(range.includes(1)).toBe(true);
      expect(range.includes(5)).toBe(true);
      expect(range.includes(0)).toBe(false);
      expect(range.includes(6)).toBe(false);
    });

    test('should contain another range within itself', () => {
      const range1 = new NumberRange(1, 5);
      const range2 = new NumberRange(2, 4);
      const range3 = new NumberRange(0, 6);
      expect(range1.contains(range2)).toBe(true);
      expect(range1.contains(range3)).toBe(false);
    });

    test('should overlap with another range', () => {
      const range1 = new NumberRange(1, 5);
      const range2 = new NumberRange(4, 6);
      const range3 = new NumberRange(6, 8);
      expect(range1.overlaps(range2)).toBe(true);
      expect(range1.overlaps(range3)).toBe(false);
    });
  });
});
