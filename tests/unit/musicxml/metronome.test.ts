import { Metronome } from '@/musicxml';
import { xml } from '@/util';

describe(Metronome, () => {
  describe('getBeatUnit', () => {
    it('returns the beat unit of the metronome', () => {
      const beatUnit = xml.beatUnit({ noteTypeValue: 'half' });
      const node = xml.metronome({ beatUnit });
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnit()).toBe('half');
    });

    it('defaults to quarter when beat unit is missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnit()).toBe('quarter');
    });

    it('defaults to quarter when beat unit is invalid', () => {
      const beatUnit = xml.beatUnit({ noteTypeValue: 'foo' });
      const node = xml.metronome({ beatUnit });
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnit()).toBe('quarter');
    });
  });

  describe('getBeatUnitDotCount', () => {
    it('returns how many dots are applied to the beat unit', () => {
      const node = xml.metronome({ beatUnitDots: [xml.beatUnitDot(), xml.beatUnitDot()] });
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnitDotCount()).toBe(2);
    });

    it('defaults to 0 when dots are missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnitDotCount()).toBe(0);
    });

    it('does not count dots after a per minute specification', () => {
      const node = xml.metronome({
        beatUnitDots: [xml.beatUnitDot()],
        perMinute: xml.perMinute(),
        perMinuteDots: [xml.beatUnitDot()],
      });
      const metronome = new Metronome(node);
      expect(metronome.getBeatUnitDotCount()).toBe(1);
    });
  });

  describe('getBeatsPerMinute', () => {
    it('returns the bpm of the metronome', () => {
      const node = xml.metronome({
        perMinute: xml.perMinute({ value: '42' }),
      });
      const metronome = new Metronome(node);
      expect(metronome.getBeatsPerMinute()).toBe(42);
    });

    it('defaults to null when missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.getBeatsPerMinute()).toBeNull();
    });

    it('does not support non-numeric bpm specifications and defaults to null', () => {
      const node = xml.metronome({
        perMinute: xml.perMinute({ value: 'foo' }),
      });
      const metronome = new Metronome(node);
      expect(metronome.getBeatsPerMinute()).toBeNull();
    });
  });
});
