import { ABOVE_BELOW, SHOW_TUPLET, START_STOP, Tuplet } from '@/musicxml';
import { xml } from '@/util';

describe(Tuplet, () => {
  describe('getType', () => {
    it.each(START_STOP.values)(`returns the type of the tuplet: '%s'`, (type) => {
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
    it.each(ABOVE_BELOW.values)(`returns the placement of the tuplet: '%s'`, (placement) => {
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

  describe('getShowNumber', () => {
    it.each(SHOW_TUPLET.values)('returns the show-number attribute', (showNumber) => {
      const node = xml.tuplet({ showNumber });
      const tuplet = new Tuplet(node);
      expect(tuplet.getShowNumber()).toBe(showNumber);
    });

    it(`defaults to 'actual' when missing`, () => {
      const node = xml.tuplet();
      const tuplet = new Tuplet(node);
      expect(tuplet.getShowNumber()).toBe('actual');
    });

    it(`defaults to 'actual' when invalid`, () => {
      const node = xml.tuplet({ showNumber: 'foo' });
      const tuplet = new Tuplet(node);
      expect(tuplet.getShowNumber()).toBe('actual');
    });
  });
});
