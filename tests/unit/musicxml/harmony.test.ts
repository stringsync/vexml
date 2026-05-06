import { Harmony } from '@/musicxml';
import { xml } from '@/util';

describe(Harmony, () => {
  describe('getRoot', () => {
    it('returns the root step and alter', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'B' }), rootAlter: xml.rootAlter({ value: -1 }) }),
        kind: xml.kind({ value: 'minor-seventh' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getRoot()).toEqual({ step: 'B', alter: -1 });
    });

    it('defaults alter to 0 when missing', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'major' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getRoot()).toEqual({ step: 'C', alter: 0 });
    });

    it('returns null when root is missing', () => {
      const node = xml.harmony({ kind: xml.kind({ value: 'none' }) });
      const harmony = new Harmony(node);
      expect(harmony.getRoot()).toBeNull();
    });

    it('returns null when root-step is missing', () => {
      const node = xml.harmony({ root: xml.root(), kind: xml.kind({ value: 'major' }) });
      const harmony = new Harmony(node);
      expect(harmony.getRoot()).toBeNull();
    });
  });

  describe('getKind', () => {
    it('returns the semantic kind value', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'major-seventh' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getKind()).toEqual({ value: 'major-seventh', text: null });
    });

    it('preserves the text override', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'minor-seventh', text: 'm7' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getKind()).toEqual({ value: 'minor-seventh', text: 'm7' });
    });

    it('defaults to none when the kind value is unrecognized', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'totally-bogus' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getKind()).toEqual({ value: 'none', text: null });
    });

    it('returns null when no kind element is present', () => {
      const node = xml.harmony({ root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }) });
      const harmony = new Harmony(node);
      expect(harmony.getKind()).toBeNull();
    });
  });

  describe('getBass', () => {
    it('returns null when no bass is present', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'major' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getBass()).toBeNull();
    });

    it('returns the bass step and alter', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'B' }), rootAlter: xml.rootAlter({ value: -1 }) }),
        kind: xml.kind({ value: 'major' }),
        bass: xml.bass({ bassStep: xml.bassStep({ value: 'D' }), bassAlter: xml.bassAlter({ value: 0 }) }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getBass()).toEqual({ step: 'D', alter: 0 });
    });
  });

  describe('getDegrees', () => {
    it('returns an empty array by default', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'dominant' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getDegrees()).toEqual([]);
    });

    it('returns each degree modification', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'dominant' }),
        degrees: [
          xml.degree({
            degreeValue: xml.degreeValue({ value: 11 }),
            degreeAlter: xml.degreeAlter({ value: 1 }),
            degreeType: xml.degreeType({ value: 'add' }),
          }),
          xml.degree({
            degreeValue: xml.degreeValue({ value: 9 }),
            degreeAlter: xml.degreeAlter({ value: -1 }),
            degreeType: xml.degreeType({ value: 'alter' }),
          }),
        ],
      });
      const harmony = new Harmony(node);
      expect(harmony.getDegrees()).toEqual([
        { value: 11, alter: 1, degreeType: 'add' },
        { value: 9, alter: -1, degreeType: 'alter' },
      ]);
    });

    it('defaults degreeType to add when unrecognized', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'dominant' }),
        degrees: [
          xml.degree({
            degreeValue: xml.degreeValue({ value: 11 }),
            degreeAlter: xml.degreeAlter({ value: 0 }),
            degreeType: xml.degreeType({ value: 'bogus' }),
          }),
        ],
      });
      const harmony = new Harmony(node);
      expect(harmony.getDegrees()).toEqual([{ value: 11, alter: 0, degreeType: 'add' }]);
    });
  });

  describe('getOffset', () => {
    it('returns the offset when present', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'major' }),
        offset: xml.offset({ value: 2 }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getOffset()).toBe(2);
    });

    it('returns null when missing', () => {
      const node = xml.harmony({
        root: xml.root({ rootStep: xml.rootStep({ value: 'C' }) }),
        kind: xml.kind({ value: 'major' }),
      });
      const harmony = new Harmony(node);
      expect(harmony.getOffset()).toBeNull();
    });
  });
});
