import { TimeSignature } from './timesignature';

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
});
