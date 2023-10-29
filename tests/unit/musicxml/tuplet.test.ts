import { TUPLET_PLACEMENTS, TUPLET_TYPES, Tuplet } from '@/musicxml';
import { xml } from '@/util';

describe(Tuplet, () => {
  describe('getType', () => {
    it.each(TUPLET_TYPES.values)(`returns the type of the tuplet: '%s'`, (type) => {
      const node = xml.tuplet({ type });
      const tuplet = new Tuplet(node);
      expect(tuplet.getType()).toBe(type);
    });

    it('defaults to null when missing', () => {
      const node = xml.tuplet();
      const tuplet = new Tuplet(node);
      expect(tuplet.getType()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.tuplet({ type: 'foo' });
      const tuplet = new Tuplet(node);
      expect(tuplet.getType()).toBeNull();
    });
  });

  describe('getPlacement', () => {
    it.each(TUPLET_PLACEMENTS.values)(`returns the placement of the tuplet: '%s'`, (placement) => {
      const node = xml.tuplet({ placement });
      const tuplet = new Tuplet(node);
      expect(tuplet.getPlacement()).toBe(placement);
    });

    it(`defaults to null when missing`, () => {
      const node = xml.tuplet();
      const tuplet = new Tuplet(node);
      expect(tuplet.getPlacement()).toBeNull();
    });

    it(`defaults to null when invalid`, () => {
      const node = xml.tuplet({ placement: 'foo' });
      const tuplet = new Tuplet(node);
      expect(tuplet.getPlacement()).toBeNull();
    });
  });
});
