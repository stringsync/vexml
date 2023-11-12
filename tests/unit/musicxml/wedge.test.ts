import { WEDGE_TYPES, Wedge } from '@/musicxml';
import { xml } from '@/util';

describe(Wedge, () => {
  describe('getType', () => {
    it.each(WEDGE_TYPES.values)(`returns the type of the wedge: '%s'`, (type) => {
      const node = xml.wedge({ type });
      const wedge = new Wedge(node);
      expect(wedge.getType()).toBe(type);
    });

    it('defaults to crescendo when invalid', () => {
      const node = xml.wedge({ type: 'foo' });
      const wedge = new Wedge(node);
      expect(wedge.getType()).toBe('crescendo');
    });

    it('defaults to crescendo when missing', () => {
      const node = xml.wedge();
      const wedge = new Wedge(node);
      expect(wedge.getType()).toBe('crescendo');
    });
  });

  describe('getSpread', () => {
    it('returns the spread of the wedge', () => {
      const node = xml.wedge({ spread: 10 });
      const wedge = new Wedge(node);
      expect(wedge.getSpread()).toBe(10);
    });

    it('defaults to 0 when invalid', () => {
      const node = xml.wedge({ spread: NaN });
      const wedge = new Wedge(node);
      expect(wedge.getSpread()).toBe(0);
    });

    it('defaults to 0 when missing', () => {
      const node = xml.wedge();
      const wedge = new Wedge(node);
      expect(wedge.getSpread()).toBe(0);
    });
  });
});
