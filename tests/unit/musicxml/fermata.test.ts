import { FERMATA_SHAPES, FERMATA_TYPES, Fermata } from '@/musicxml';
import { xml } from '@/util';

describe(Fermata, () => {
  describe('getShape', () => {
    it.each(FERMATA_SHAPES.values)('returns the shape of the fermata', (shape) => {
      const node = xml.fermata({ shape });
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe(shape);
    });

    it('defaults to normal when missing', () => {
      const node = xml.fermata();
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe('normal');
    });

    it('defaults to normal when invalid', () => {
      const node = xml.fermata({ shape: 'foo' });
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe('normal');
    });
  });

  describe('getType', () => {
    it.each(FERMATA_TYPES.values)('returns the type of the fermata', (type) => {
      const node = xml.fermata({ type });
      const fermata = new Fermata(node);
      expect(fermata.getType()).toBe(type);
    });

    it('defaults to upright when missing', () => {
      const node = xml.fermata();
      const fermata = new Fermata(node);
      expect(fermata.getType()).toBe('upright');
    });

    it('defaults to upright when invalid', () => {
      const node = xml.fermata({ type: 'foo' });
      const fermata = new Fermata(node);
      expect(fermata.getType()).toBe('upright');
    });
  });
});
