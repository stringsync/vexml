import { TimeSignature } from '@/musicxml/timesignature';
import { Fraction } from '@/util';

describe(TimeSignature, () => {
  describe('of', () => {
    it('creates a normal time signature with the specification', () => {
      const timeSignature = TimeSignature.of(3, 4);
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(3, 4)]);
      expect(timeSignature.getSymbol()).toBeNull();
    });
  });

  describe('common', () => {
    it('creates a time signature in common time', () => {
      const timeSignature = TimeSignature.common();
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(4, 4)]);
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });

  describe('cut', () => {
    it('creates a time signature in cut time', () => {
      const timeSignature = TimeSignature.cut();
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(2, 2)]);
      expect(timeSignature.getSymbol()).toBe('cut');
    });
  });

  describe('combine', () => {
    it('combines multiple time signatures', () => {
      const timeSignature = TimeSignature.combine([TimeSignature.of(2, 4), TimeSignature.common()]);
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(2, 4), new Fraction(4, 4)]);
    });

    it('does not propagate symbols', () => {
      const timeSignature = TimeSignature.combine([TimeSignature.cut(), TimeSignature.common()]);
      expect(timeSignature.getSymbol()).toBeNull();
    });
  });

  describe('getSymbol', () => {
    it('returns the symbol of the time signature', () => {
      const timeSignature = TimeSignature.common();
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });

  describe('isEqual', () => {
    it('returns true when the time signatures are equal', () => {
      const timeSignature1 = TimeSignature.of(4, 4);
      const timeSignature2 = TimeSignature.of(4, 4);
      expect(timeSignature1.isEqual(timeSignature2)).toBeTrue();
    });

    it('returns false when the time signatures are not exactly equal', () => {
      const timeSignature1 = TimeSignature.of(2, 4);
      const timeSignature2 = TimeSignature.of(4, 8);
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns false when the time signatures differ in symbols only', () => {
      const timeSignature1 = TimeSignature.common();
      const timeSignature2 = TimeSignature.of(4, 4);
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns true for equal complex time signatures', () => {
      const timeSignature1 = TimeSignature.complex([new Fraction(3, 8), new Fraction(2, 8)]);
      const timeSignature2 = TimeSignature.complex([new Fraction(3, 8), new Fraction(2, 8)]);
      expect(timeSignature1.isEqual(timeSignature2)).toBeTrue();
    });

    it('returns false for complex time signatures that have different orders', () => {
      const timeSignature1 = TimeSignature.complex([new Fraction(3, 8), new Fraction(2, 8)]);
      const timeSignature2 = TimeSignature.complex([new Fraction(2, 8), new Fraction(3, 8)]);
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns false when the time signatures are composed of components that have different lengths', () => {
      const timeSignature1 = TimeSignature.complex([new Fraction(3, 8), new Fraction(2, 8)]);
      const timeSignature2 = TimeSignature.complex([new Fraction(2, 8), new Fraction(3, 8), new Fraction(4, 8)]);
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });
  });

  describe('toFraction', () => {
    it('converts a simple time signature to a fraction', () => {
      const timeSignature = TimeSignature.of(4, 4);
      expect(timeSignature.toFraction().isEquivalent(new Fraction(4, 4)));
    });

    it('converts a complex time signature to a single fraction using the lcm', () => {
      const timeSignature = TimeSignature.complex([new Fraction(3, 4), new Fraction(2, 8)]);
      expect(timeSignature.toFraction().isEqual(new Fraction(8, 8))).toBeTrue();
    });
  });
});
