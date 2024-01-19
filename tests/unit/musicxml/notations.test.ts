import { xml } from '@/util';
import { Tied, Notations, Ornaments, Slur, Tuplet, VERTICAL_DIRECTIONS, Fermata, Accent } from '@/musicxml';

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

    it(`defaults to null when the arpeggio direction is invalid`, () => {
      const node = xml.notations({ arpeggiate: xml.arpeggiate({ direction: 'foo' }) });
      const notations = new Notations(node);
      expect(notations.getArpeggioDirection()).toBeNull();
    });

    it(`defaults to null when the arpeggio direction is missing`, () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getArpeggioDirection()).toBeNull();
    });
  });

  describe('hasTuplets', () => {
    it('returns true when there is at least one tuplet', () => {
      const node = xml.notations({ tuplets: [xml.tuplet()] });
      const notations = new Notations(node);
      expect(notations.hasTuplets()).toBeTrue();
    });

    it('returns false when there are no tuplets', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.hasTuplets()).toBeFalse();
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

  describe('getTieds', () => {
    it('returns the tieds of the notations', () => {
      const tied1 = xml.tied({ type: 'start', placement: 'above' });
      const tied2 = xml.tied({ type: 'stop', placement: 'below' });
      const node = xml.notations({ tieds: [tied1, tied2] });

      const notations = new Notations(node);

      expect(notations.getTieds()).toStrictEqual([new Tied(tied1), new Tied(tied2)]);
    });

    it('defaults to empty array when missing', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getTieds()).toStrictEqual([]);
    });
  });

  describe('getSlurs', () => {
    it('returns the slurs of the notations', () => {
      const slur1 = xml.slur({ type: 'stop', placement: 'above' });
      const slur2 = xml.slur({ type: 'start', placement: 'below' });
      const node = xml.notations({ slurs: [slur1, slur2] });

      const notations = new Notations(node);

      expect(notations.getSlurs()).toStrictEqual([new Slur(slur1), new Slur(slur2)]);
    });

    it('defaults to empty array when missing', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getSlurs()).toStrictEqual([]);
    });
  });

  describe('getOrnaments', () => {
    it('returns the ornaments of the notations', () => {
      const ornaments = xml.ornaments();
      const node = xml.notations({ ornaments: [ornaments] });
      const notations = new Notations(node);

      expect(notations.getOrnaments()).toStrictEqual([new Ornaments(ornaments)]);
    });

    it('defaults to an empty array', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getOrnaments()).toStrictEqual([]);
    });
  });

  describe('getFermatas', () => {
    it('returns the fermatas of the notations', () => {
      const fermata = xml.fermata();
      const node = xml.notations({ fermatas: [fermata] });
      const notations = new Notations(node);
      expect(notations.getFermatas()).toStrictEqual([new Fermata(fermata)]);
    });

    it('defaults to an empty array', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getFermatas()).toStrictEqual([]);
    });
  });

  describe('getAccents', () => {
    it('returns the accents of the notations', () => {
      const accent1 = xml.accent({ placement: 'above' });
      const accent2 = xml.accent({ placement: 'below' });
      const node = xml.notations({ accents: [accent1, accent2] });

      const notations = new Notations(node);

      expect(notations.getAccents()).toStrictEqual([new Accent(accent1), new Accent(accent2)]);
    });

    it('defaults to an empty array when missing', () => {
      const node = xml.notations();
      const notations = new Notations(node);
      expect(notations.getAccents()).toBeEmpty();
    });
  });
});
