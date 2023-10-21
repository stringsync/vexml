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

  describe('getDotCount', () => {
    it('returns how many dots the metronome has', () => {
      const node = xml.metronome({ beatUnitDots: [xml.beatUnitDot(), xml.beatUnitDot()] });
      const metronome = new Metronome(node);
      expect(metronome.getDotCount()).toBe(2);
    });

    it('defaults to 0 when dots are missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.getDotCount()).toBe(0);
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

    it('defaults to 120 when missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.getBeatsPerMinute()).toBe(120);
    });

    it('does not support non-numeric bpm specifications and defaults to 120', () => {
      const node = xml.metronome({
        perMinute: xml.perMinute({ value: 'foo' }),
      });
      const metronome = new Metronome(node);
      expect(metronome.getBeatsPerMinute()).toBe(120);
    });
  });
});
