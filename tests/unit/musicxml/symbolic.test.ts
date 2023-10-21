import { Symbolic } from '@/musicxml';
import { xml } from '@/util';

describe(Symbolic, () => {
  describe('getSmulfGlyphName', () => {
    it('returns the content of the symbolic', () => {
      const node = xml.symbolic({ smuflGlyphName: 'foo' });
      const symbolic = new Symbolic(node);
      expect(symbolic.getSmulfGlyphName()).toBe('foo');
    });

    it('defaults to empty string when content is not provided', () => {
      const node = xml.symbolic();
      const symbolic = new Symbolic(node);
      expect(symbolic.getSmulfGlyphName()).toBe('');
    });
  });
});
