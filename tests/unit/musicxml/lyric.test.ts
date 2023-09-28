import { Lyric } from '@/musicxml';
import { xml } from '@/util';

describe(Lyric, () => {
  describe('getVerseNumber', () => {
    it('returns the verse number of the lyric', () => {
      const node = xml.lyric({ number: 42 });
      const lyric = new Lyric(node);
      expect(lyric.getVerseNumber()).toBe(42);
    });

    it('defaults to 1 when the verse number is missing', () => {
      const node = xml.lyric();
      const lyric = new Lyric(node);
      expect(lyric.getVerseNumber()).toBe(1);
    });

    it('defaults to 1 when the verse number is not a valid integer', () => {
      const node = xml.lyric({ number: NaN });
      const lyric = new Lyric(node);
      expect(lyric.getVerseNumber()).toBe(1);
    });
  });

  describe('getComponents', () => {
    it('returns the components of the lyric', () => {
      const node = xml.lyric({
        components: [
          xml.syllabic({ value: 'begin' }),
          xml.text({ value: 'hel' }),
          xml.elision({ value: '-' }),
          xml.syllabic({ value: 'end' }),
          xml.text({ value: 'lo' }),
        ],
      });

      const lyric = new Lyric(node);

      expect(lyric.getComponents()).toStrictEqual([
        { type: 'syllabic', value: 'begin' },
        { type: 'text', value: 'hel' },
        { type: 'elision', value: '-' },
        { type: 'syllabic', value: 'end' },
        { type: 'text', value: 'lo' },
      ]);
    });

    it('returns an empty array when the lyric is empty', () => {
      const node = xml.lyric();
      const lyric = new Lyric(node);
      expect(lyric.getComponents()).toStrictEqual([]);
    });

    it('defaults invalid syllabic values to single', () => {
      const node = xml.lyric({
        components: [xml.syllabic({ value: 'foo' })],
      });

      const lyric = new Lyric(node);

      expect(lyric.getComponents()).toStrictEqual([{ type: 'syllabic', value: 'single' }]);
    });
  });
});
