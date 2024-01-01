import { Metronome } from '@/musicxml';
import { xml } from '@/util';

describe(Metronome, () => {
  describe('parentheses', () => {
    it('returns true when the parentheses attribute is yes', () => {
      const node = xml.metronome({ parentheses: 'yes' });
      const metronome = new Metronome(node);
      expect(metronome.parentheses()).toBeTrue();
    });

    it('returns false when the parentheses attribute is no', () => {
      const node = xml.metronome({ parentheses: 'no' });
      const metronome = new Metronome(node);
      expect(metronome.parentheses()).toBeFalse();
    });

    it('returns false when the parentheses attribute is missing', () => {
      const node = xml.metronome();
      const metronome = new Metronome(node);
      expect(metronome.parentheses()).toBeFalse();
    });

    it('returns false when the parentheses attribute is invalid', () => {
      const node = xml.metronome({ parentheses: 'foo' });
      const metronome = new Metronome(node);
      expect(metronome.parentheses()).toBeFalse();
    });
  });

  describe('getMark', () => {
    it('returns a note / bpm metronome mark', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [xml.beatUnit({ noteTypeValue: 'quarter' }), xml.perMinute({ value: '42' })],
        })
      );

      expect(metronome.getMark()).toEqual({
        left: { type: 'note', unit: 'quarter', dotCount: 0 },
        right: { type: 'bpm', bpm: 42 },
      });
    });

    it('returns a note / note metronome mark', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [xml.beatUnit({ noteTypeValue: 'quarter' }), xml.beatUnit({ noteTypeValue: 'half' })],
        })
      );

      expect(metronome.getMark()).toEqual({
        left: { type: 'note', unit: 'quarter', dotCount: 0 },
        right: { type: 'note', unit: 'half', dotCount: 0 },
      });
    });

    it('returns a note (dots) / note metronome mark', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnitDot(),
            xml.beatUnit({ noteTypeValue: 'half' }),
          ],
        })
      );

      expect(metronome.getMark()).toEqual({
        left: { type: 'note', unit: 'quarter', dotCount: 1 },
        right: { type: 'note', unit: 'half', dotCount: 0 },
      });
    });

    it('returns a note / note (dots) metronome mark', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
            xml.beatUnitDot(),
          ],
        })
      );

      expect(metronome.getMark()).toEqual({
        left: { type: 'note', unit: 'quarter', dotCount: 0 },
        right: { type: 'note', unit: 'half', dotCount: 1 },
      });
    });

    it('returns a note (dots) / note (dots) metronome mark', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnitDot(),
            xml.beatUnitDot(),
            xml.beatUnit({ noteTypeValue: 'half' }),
            xml.beatUnitDot(),
          ],
        })
      );

      expect(metronome.getMark()).toEqual({
        left: { type: 'note', unit: 'quarter', dotCount: 2 },
        right: { type: 'note', unit: 'half', dotCount: 1 },
      });
    });

    it('returns null when the left operand is invalid', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.beatUnitDot(),
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
          ],
        })
      );

      expect(metronome.getMark()).toBeNull();
    });

    it('returns null when the right operand is invalid', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
          ],
        })
      );

      expect(metronome.getMark()).toBeNull();
    });

    it('returns null when the left and operands are invalid', () => {
      const metronome = new Metronome(
        xml.metronome({
          content: [
            xml.perMinute({ value: '42' }),
            xml.beatUnit({ noteTypeValue: 'quarter' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
            xml.beatUnit({ noteTypeValue: 'half' }),
            xml.perMinute({ value: '120' }),
          ],
        })
      );

      expect(metronome.getMark()).toBeNull();
    });
  });

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
