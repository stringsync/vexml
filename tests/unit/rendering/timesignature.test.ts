import { TimeSignature } from '@/rendering/timesignature';
import { Fraction } from '@/util';
import { DEFAULT_CONFIG } from '@/config';
import { NoopLogger } from '@/debug';

describe(TimeSignature, () => {
  const log = new NoopLogger();
  const config = DEFAULT_CONFIG;

  describe('of', () => {
    it('creates a normal time signature with the specification', () => {
      const timeSignature = TimeSignature.of({ config, log, beatsPerMeasure: 3, beatValue: 4 });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(3, 4)]);
      expect(timeSignature.getSymbol()).toBeNull();
    });
  });

  describe('common', () => {
    it('creates a time signature in common time', () => {
      const timeSignature = TimeSignature.common({ config, log });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(4, 4)]);
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });

  describe('cut', () => {
    it('creates a time signature in cut time', () => {
      const timeSignature = TimeSignature.cut({ config, log });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(2, 2)]);
      expect(timeSignature.getSymbol()).toBe('cut');
    });
  });

  describe('combine', () => {
    it('combines multiple time signatures', () => {
      const timeSignature = TimeSignature.combine({
        config,
        log,
        timeSignatures: [
          TimeSignature.of({ config, log, beatsPerMeasure: 2, beatValue: 4 }),
          TimeSignature.common({ config, log }),
        ],
      });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(2, 4), new Fraction(4, 4)]);
    });

    it('does not propagate symbols', () => {
      const timeSignature = TimeSignature.combine({
        config,
        log,
        timeSignatures: [TimeSignature.cut({ config, log }), TimeSignature.common({ config, log })],
      });
      expect(timeSignature.getSymbol()).toBeNull();
    });
  });

  describe('singleNumber', () => {
    it('wraps a time signature with a single-number symbol', () => {
      const timeSignature = TimeSignature.singleNumber({
        config,
        log,
        timeSignature: TimeSignature.common({ config, log }),
      });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(4, 4)]);
      expect(timeSignature.getSymbol()).toBe('single-number');
    });
  });

  describe('hidden', () => {
    it('creates the specs of a hidden time signature', () => {
      const timeSignature = TimeSignature.hidden({ config, log });
      expect(timeSignature.getComponents()).toStrictEqual([new Fraction(4, 4)]);
      expect(timeSignature.getSymbol()).toBe('hidden');
    });
  });

  describe('getSymbol', () => {
    it('returns the symbol of the time signature', () => {
      const timeSignature = TimeSignature.common({ config, log });
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });

  describe('isEqual', () => {
    it('returns true when the time signatures are equal', () => {
      const timeSignature1 = TimeSignature.of({ config, log, beatsPerMeasure: 4, beatValue: 4 });
      const timeSignature2 = TimeSignature.of({ config, log, beatsPerMeasure: 4, beatValue: 4 });
      expect(timeSignature1.isEqual(timeSignature2)).toBeTrue();
    });

    it('returns false when the time signatures are not exactly equal', () => {
      const timeSignature1 = TimeSignature.of({ config, log, beatsPerMeasure: 2, beatValue: 4 });
      const timeSignature2 = TimeSignature.of({ config, log, beatsPerMeasure: 4, beatValue: 8 });
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns false when the time signatures differ in symbols only', () => {
      const timeSignature1 = TimeSignature.common({ config, log });
      const timeSignature2 = TimeSignature.of({ config, log, beatsPerMeasure: 4, beatValue: 4 });
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns true for equal complex time signatures', () => {
      const timeSignature1 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(3, 8), new Fraction(2, 8)],
      });
      const timeSignature2 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(3, 8), new Fraction(2, 8)],
      });
      expect(timeSignature1.isEqual(timeSignature2)).toBeTrue();
    });

    it('returns false for complex time signatures that have different orders', () => {
      const timeSignature1 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(3, 8), new Fraction(2, 8)],
      });
      const timeSignature2 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(2, 8), new Fraction(3, 8)],
      });
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });

    it('returns false when the time signatures are composed of components that have different lengths', () => {
      const timeSignature1 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(3, 8), new Fraction(2, 8)],
      });
      const timeSignature2 = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(2, 8), new Fraction(3, 8), new Fraction(4, 8)],
      });
      expect(timeSignature1.isEqual(timeSignature2)).toBeFalse();
    });
  });

  describe('toFraction', () => {
    it('converts a simple time signature to a fraction', () => {
      const timeSignature = TimeSignature.of({ config, log, beatsPerMeasure: 4, beatValue: 4 });
      expect(timeSignature.toFraction().isEquivalent(new Fraction(4, 4)));
    });

    it('converts a complex time signature to a single fraction using the lcm', () => {
      const timeSignature = TimeSignature.complex({
        config,
        log,
        components: [new Fraction(3, 4), new Fraction(2, 8)],
      });
      expect(timeSignature.toFraction().isEqual(new Fraction(8, 8))).toBeTrue();
    });
  });
});
