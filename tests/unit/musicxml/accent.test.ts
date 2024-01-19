import { ABOVE_BELOW, Accent } from '@/musicxml';
import { xml } from '@/util';

describe(Accent, () => {
  describe('getPlacement', () => {
    it.each(ABOVE_BELOW.values)('returns the placement of the accent: %s', (placement) => {
      const node = xml.accent({ placement });
      const accent = new Accent(node);
      expect(accent.getPlacement()).toBe(placement);
    });

    it(`defaults to 'above' when missing`, () => {
      const node = xml.accent();
      const accent = new Accent(node);
      expect(accent.getPlacement()).toBe('above');
    });

    it(`defaults to 'above' when invalid`, () => {
      const node = xml.accent({ placement: 'foo' });
      const accent = new Accent(node);
      expect(accent.getPlacement()).toBe('above');
    });
  });
});
