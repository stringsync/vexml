import { TimeSignature } from '@/musicxml/timesignature';

describe(TimeSignature, () => {
  describe('of', () => {
    it('creates a normal time signature with the specification', () => {
      const timeSignature = TimeSignature.of(3, 4);
      expect(timeSignature.getBeatsPerMeasure()).toBe(3);
      expect(timeSignature.getBeatValue()).toBe(4);
      expect(timeSignature.getSymbol()).toBeNull();
    });
  });

  describe('common', () => {
    it('creates a time signature in common time', () => {
      const timeSignature = TimeSignature.common();
      expect(timeSignature.getBeatsPerMeasure()).toBe(4);
      expect(timeSignature.getBeatValue()).toBe(4);
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });

  describe('cut', () => {
    it('creates a time signature in cut time', () => {
      const timeSignature = TimeSignature.cut();
      expect(timeSignature.getBeatsPerMeasure()).toBe(2);
      expect(timeSignature.getBeatValue()).toBe(2);
      expect(timeSignature.getSymbol()).toBe('cut');
    });
  });

  describe('getBeatsPerMeasure', () => {
    it('returns the number of beats per measure', () => {
      const timeSignature = TimeSignature.of(6, 8);
      expect(timeSignature.getBeatsPerMeasure()).toBe(6);
    });
  });

  describe('getBeatValue', () => {
    const timeSignature = TimeSignature.of(6, 8);
    expect(timeSignature.getBeatValue()).toBe(8);
  });

  describe('toString', () => {
    it('calculates the string representation of the time signature', () => {
      const timeSignature = TimeSignature.of(6, 8);
      expect(timeSignature.toString()).toBe('6/8');
    });
  });

  describe('getSymbol', () => {
    it('returns the symbol of the time signature', () => {
      const timeSignature = TimeSignature.common();
      expect(timeSignature.getSymbol()).toBe('common');
    });
  });
});
