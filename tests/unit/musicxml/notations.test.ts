import { xml } from '@/util';
import { Notations, Tuplet, VERTICAL_DIRECTIONS } from '@/musicxml';

describe(Notations, () => {
  describe('isArpeggiated', () => {
    it('returns true when arpeggiate is present', () => {
      const node = xml.notations({ arpeggiate: xml.arpeggiate() });
      const notations = new Notations(node);
      expect(notations.isArpeggiated()).toBeTrue();
    });

    it('returns false when arpeggiate is absent', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.isArpeggiated()).toBeFalse();
    });
  });

  describe('getArpeggioDirection', () => {
    it.each(VERTICAL_DIRECTIONS.values)(`returns the arpeggio direction: '%s'`, (direction) => {
      const node = xml.notations({ arpeggiate: xml.arpeggiate({ direction }) });
      const notations = new Notations(node);
      expect(notations.getArpeggioDirection()).toBe(direction);
    });

    it(`defaults 'up' when the arpeggio direction is invalid`, () => {
      const node = xml.notations({ arpeggiate: xml.arpeggiate({ direction: 'foo' }) });
      const notations = new Notations(node);
      expect(notations.getArpeggioDirection()).toBe('up');
    });

    it(`defaults 'up' when the arpeggio direction is missing`, () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getArpeggioDirection()).toBe('up');
    });
  });

  describe('getTuplets', () => {
    it('returns the tuplets of the notations', () => {
      const tuplet1 = xml.tuplet({ type: 'start' });
      const tuplet2 = xml.tuplet({ type: 'stop' });
      const node = xml.notations({ tuplets: [tuplet1, tuplet2] });

      const notations = new Notations(node);

      expect(notations.getTuplets()).toStrictEqual([new Tuplet(tuplet1), new Tuplet(tuplet2)]);
    });

    it('defaults to empty array when missing', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getTuplets()).toStrictEqual([]);
    });
  });
});
