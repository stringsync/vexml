import { Time } from '@/musicxml/time';
import { TimeSignature } from '@/musicxml/timesignature';
import { Fraction, xml } from '@/util';

describe(Time, () => {
  describe('getTimeSignatures', () => {
    it('returns simple time signatures of the time', () => {
      const node = xml.time({
        times: [{ beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) }],
      });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.of(3, 4));
    });

    it('returns complex time signatures of the time', () => {
      const node = xml.time({
        times: [{ beats: xml.beats({ value: '3+4' }), beatType: xml.beatType({ value: '4' }) }],
      });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.complex([new Fraction(3, 4), new Fraction(4, 4)]));
    });

    it('returns multi simple time signatures of the time', () => {
      const node = xml.time({
        times: [
          { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
          { beats: xml.beats({ value: '6' }), beatType: xml.beatType({ value: '8' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(
        TimeSignature.combine([TimeSignature.of(3, 4), TimeSignature.of(6, 8)])
      );
    });

    it('returns multi complex and simple time signatures of the time', () => {
      const node = xml.time({
        times: [
          { beats: xml.beats({ value: '3+2' }), beatType: xml.beatType({ value: '4' }) },
          { beats: xml.beats({ value: '6' }), beatType: xml.beatType({ value: '8' }) },
        ],
      });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(
        TimeSignature.combine([TimeSignature.complex([new Fraction(3, 4), new Fraction(2, 4)]), TimeSignature.of(6, 8)])
      );
    });

    it('returns null when beat and beat type elements are missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getTimeSignature()).toBeNull();
    });

    it('handles the common symbol', () => {
      const node = xml.time({ symbol: 'common' });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.common());
    });

    it('handles the cut symbol', () => {
      const node = xml.time({ symbol: 'cut' });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.cut());
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
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.common());
    });

    it('returns a hidden time signature when a senza misura is present', () => {
      const node = xml.time({ senzaMisura: xml.senzaMisura() });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.hidden());
    });

    it('returns a hidden time signature when a senza misura is present and a symbol is specified', () => {
      const node = xml.time({
        symbol: 'common',
        senzaMisura: xml.senzaMisura(),
      });
      const time = new Time(node);
      expect(time.getTimeSignature()).toStrictEqual(TimeSignature.hidden());
    });
  });
});
