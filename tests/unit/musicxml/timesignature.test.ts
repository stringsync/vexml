import { TimeSignature } from '@/musicxml/timesignature';
import { Fraction } from '@/util';

describe(TimeSignature, () => {
  describe('getBeatsPerMeasure', () => {
    it('returns the number of beats per measure', () => {
      const timeSignature = new TimeSignature(6, 8);
      expect(timeSignature.getBeatsPerMeasure()).toBe(6);
    });
  });

  describe('getBeatValue', () => {
    const timeSignature = new TimeSignature(6, 8);
    expect(timeSignature.getBeatValue()).toBe(8);
  });

  describe('toString', () => {
    it('calculates the string representation of the time signature', () => {
      const timeSignature = new TimeSignature(6, 8);
      expect(timeSignature.toString()).toBe('6/8');
    });
  });

  describe('toFraction', () => {
    it('converts the time signature to a fraction', () => {
      const timeSignature = new TimeSignature(4, 4);
      expect(timeSignature.toFraction().isEqual(new Fraction(1))).toBeTrue();
    });
  });
});
