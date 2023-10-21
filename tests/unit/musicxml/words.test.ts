import { Words } from '@/musicxml';
import { xml } from '@/util';

describe(Words, () => {
  describe('getContent', () => {
    it('returns the content of the words', () => {
      const node = xml.words({ content: 'foo' });
      const words = new Words(node);
      expect(words.getContent()).toBe('foo');
    });

    it('defaults to empty string when content is not provided', () => {
      const node = xml.words();
      const words = new Words(node);
      expect(words.getContent()).toBe('');
    });
  });
});
