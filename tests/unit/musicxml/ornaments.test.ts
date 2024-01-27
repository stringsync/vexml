import { AccidentalMark, Ornaments, TrillMark, WavyLine } from '@/musicxml';
import { xml } from '@/util';

describe(Ornaments, () => {
  describe('getTrillMarks', () => {
    it('returns the trill mark entries of the ornaments', () => {
      const trillMark = xml.trillMark();
      const node = xml.ornaments({ contents: [trillMark] });
      const ornaments = new Ornaments(node);
      expect(ornaments.getTrillMarks()).toStrictEqual([{ value: new TrillMark(trillMark), accidentalMarks: [] }]);
    });

    it('includes accidental marks after the trill mark', () => {
      const trillMark = xml.trillMark();
      const accidentalMark1 = xml.accidentalMark();
      const accidentalMark2 = xml.accidentalMark();
      const node = xml.ornaments({ contents: [accidentalMark1, trillMark, accidentalMark2] });

      const ornaments = new Ornaments(node);

      expect(ornaments.getTrillMarks()).toStrictEqual([
        {
          value: new TrillMark(trillMark),
          accidentalMarks: [new AccidentalMark(accidentalMark2)],
        },
      ]);
    });

    it('defaults to an empty array', () => {
      const node = xml.ornaments();
      const ornaments = new Ornaments(node);
      expect(ornaments.getTrillMarks()).toStrictEqual([]);
    });
  });

  describe('getWavyLines', () => {
    it('returns the wavy lines of the ornaments', () => {
      const wavyLine1 = xml.wavyLine({ type: 'start' });
      const wavyLine2 = xml.wavyLine({ type: 'stop' });
      const node = xml.ornaments({ contents: [wavyLine1, wavyLine2] });

      const ornaments = new Ornaments(node);

      expect(ornaments.getWavyLines()).toStrictEqual([
        { value: new WavyLine(wavyLine1), accidentalMarks: [] },
        { value: new WavyLine(wavyLine2), accidentalMarks: [] },
      ]);
    });

    it('defaults to an empty array', () => {
      const node = xml.ornaments();
      const ornaments = new Ornaments(node);
      expect(ornaments.getWavyLines()).toStrictEqual([]);
    });
  });
});
