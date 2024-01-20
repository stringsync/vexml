import { Articulations } from '@/musicxml/';
import { xml } from '@/util';

describe(Articulations, () => {
  describe('getAccents', () => {
    it('returns the accents of the articulations', () => {
      const accent1 = xml.accent({ placement: 'above' });
      const accent2 = xml.accent({ placement: 'below' });
      const node = xml.articulations({ accents: [accent1, accent2] });

      const articulations = new Articulations(node);

      expect(articulations.getAccents()).toStrictEqual([
        { type: 'accent', placement: 'above' },
        { type: 'accent', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no accents', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getAccents()).toBeEmpty();
    });

    it('does not conflate strong accents', () => {
      const node = xml.articulations({
        strongAccents: [xml.strongAccent({ placement: 'above' })],
      });
      const articulations = new Articulations(node);
      expect(articulations.getAccents()).toBeEmpty();
    });
  });

  describe('getStrongAccents', () => {
    it('returns the strong accents of the articulations', () => {
      const strongAccent1 = xml.strongAccent({ placement: 'above' });
      const strongAccent2 = xml.strongAccent({ placement: 'below' });
      const node = xml.articulations({ strongAccents: [strongAccent1, strongAccent2] });

      const articulations = new Articulations(node);

      expect(articulations.getStrongAccents()).toStrictEqual([
        { type: 'strongaccent', placement: 'above' },
        { type: 'strongaccent', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no strong accents', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getStrongAccents()).toBeEmpty();
    });

    it('does not conflate normal accents', () => {
      const node = xml.articulations({
        accents: [xml.accent({ placement: 'above' })],
      });
      const articulations = new Articulations(node);
      expect(articulations.getStrongAccents()).toBeEmpty();
    });
  });

  describe('getStaccatos', () => {
    it('returns the staccatos of the articulations', () => {
      const staccato1 = xml.staccato({ placement: 'above' });
      const staccato2 = xml.staccato({ placement: 'below' });
      const node = xml.articulations({ staccatos: [staccato1, staccato2] });

      const articulations = new Articulations(node);

      expect(articulations.getStaccatos()).toStrictEqual([
        { type: 'staccato', placement: 'above' },
        { type: 'staccato', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no staccatos', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getStaccatos()).toBeEmpty();
    });
  });
});
