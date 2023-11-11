import { Ornaments, WavyLine } from '@/musicxml';
import { xml } from '@/util';

describe(Ornaments, () => {
  describe('hasTrillMark', () => {
    it('returns true when there is at least one trill mark', () => {
      const trillMark = xml.trillMark();
      const node = xml.ornaments({ contents: [trillMark] });
      const ornaments = new Ornaments(node);
      expect(ornaments.hasTrillMark()).toBeTrue();
    });

    it('returns false when there are no trill marks', () => {
      const node = xml.ornaments();
      const ornaments = new Ornaments(node);
      expect(ornaments.hasTrillMark()).toBeFalse();
    });
  });

  describe('getWavyLines', () => {
    it('returns the wavy lines of the ornaments', () => {
      const wavyLine1 = xml.wavyLine({ type: 'start' });
      const wavyLine2 = xml.wavyLine({ type: 'stop' });
      const node = xml.ornaments({ contents: [wavyLine1, wavyLine2] });
      const ornaments = new Ornaments(node);
      expect(ornaments.getWavyLines()).toStrictEqual([new WavyLine(wavyLine1), new WavyLine(wavyLine2)]);
    });

    it('defaults to an empty array', () => {
      const node = xml.ornaments();
      const ornaments = new Ornaments(node);
      expect(ornaments.getWavyLines()).toStrictEqual([]);
    });
  });
});
