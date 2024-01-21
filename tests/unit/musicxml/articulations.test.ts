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

  describe('getTenutos', () => {
    it('returns the tenutos of the articulations', () => {
      const tenuto1 = xml.tenuto({ placement: 'above' });
      const tenuto2 = xml.tenuto({ placement: 'below' });
      const node = xml.articulations({ tenutos: [tenuto1, tenuto2] });

      const articulations = new Articulations(node);

      expect(articulations.getTenutos()).toStrictEqual([
        { type: 'tenuto', placement: 'above' },
        { type: 'tenuto', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no tenutos', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getTenutos()).toBeEmpty();
    });
  });

  describe('getDetactedLegatos', () => {
    it('returns the detached legatos of the articulations', () => {
      const detachedLegato1 = xml.detachedLegato({ placement: 'above' });
      const detachedLegato2 = xml.detachedLegato({ placement: 'below' });
      const node = xml.articulations({ detachedLegatos: [detachedLegato1, detachedLegato2] });

      const articulations = new Articulations(node);

      expect(articulations.getDetachedLegatos()).toStrictEqual([
        { type: 'detachedlegato', placement: 'above' },
        { type: 'detachedlegato', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no detached legatos', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getDetachedLegatos()).toBeEmpty();
    });
  });

  describe('getStaccatissimos', () => {
    it('returns the staccatissimos of the articulations', () => {
      const staccatissimo1 = xml.staccatissimo({ placement: 'above' });
      const staccatissimo2 = xml.staccatissimo({ placement: 'below' });
      const node = xml.articulations({ staccatissimos: [staccatissimo1, staccatissimo2] });

      const articulations = new Articulations(node);

      expect(articulations.getStaccatissimos()).toStrictEqual([
        { type: 'staccatissimo', placement: 'above' },
        { type: 'staccatissimo', placement: 'below' },
      ]);
    });

    it('returns an empty array if there are no staccatissimos', () => {
      const node = xml.articulations();
      const articulations = new Articulations(node);
      expect(articulations.getStaccatissimos()).toBeEmpty();
    });
  });
});
