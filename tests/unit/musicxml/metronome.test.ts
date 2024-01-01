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
});
