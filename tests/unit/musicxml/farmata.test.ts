import { FERMATA_SHAPES, Fermata } from '@/musicxml';
import { xml } from '@/util';

describe(Fermata, () => {
  describe('getShape', () => {
    it.each(FERMATA_SHAPES.values)('returns the shape of the fermata', (shape) => {
      const node = xml.fermata({ shape: xml.fermataShape({ value: shape }) });
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe(shape);
    });

    it('defaults to normal when missing', () => {
      const node = xml.fermata();
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe('normal');
    });

    it('defaults to normal when invalid', () => {
      const node = xml.fermata({ shape: xml.fermataShape({ value: 'foo' }) });
      const fermata = new Fermata(node);
      expect(fermata.getShape()).toBe('normal');
    });
  });
});
