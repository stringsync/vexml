import { Time } from '@/musicxml/time';
import { TimeSignature } from '@/musicxml/timesignature';
import { Fraction, xml } from '@/util';

describe(Time, () => {
  describe('getTimeSignatures', () => {
    it('returns simple time signatures of the time', () => {
      const node = xml.time({
        times: [
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '8' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.of(3, 4), TimeSignature.of(3, 8)]);
    });

    it('returns complex time signatures of the time', () => {
      const node = xml.time({
        times: [{ beats: xml.beats({ value: '3+4' }), beatType: xml.beatType({ value: '4' }) }],
      });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.complex([new Fraction(3, 4), new Fraction(4, 4)])]);
    });

    it('returns an empty array when beat and beat type elements are missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getTimeSignatures()).toBeEmpty();
    });

    it('ignores extra beats', () => {
      const node = xml.time({
        times: [
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
          { beats: xml.beats({ value: '3' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.of(3, 4)]);
    });

    it('ignores extra beat types', () => {
      const node = xml.time({
        times: [
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
          { beatType: xml.beatType({ value: '6' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.of(3, 4)]);
    });

    it('handles the common symbol', () => {
      const node = xml.time({ symbol: 'common' });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.common()]);
    });

    it('handles the cut symbol', () => {
      const node = xml.time({ symbol: 'cut' });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.cut()]);
    });

    it('ignores time specifications when a valid symbol is specified', () => {
      const node = xml.time({
        symbol: 'common',
        times: [
          // Incompatible with common, but it shouldn't matter.
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '8' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignatures()).toStrictEqual([TimeSignature.common()]);
    });
  });
});
