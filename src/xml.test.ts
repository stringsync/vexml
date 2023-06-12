import * as xml from './xml';

type FnNames = keyof typeof xml;

const AUTO_CRASH_TEST_SKIP_NAMES: Set<FnNames> = new Set(['createElement', 'createNamedElement']);

describe('xml', () => {
  describe('createElement', () => {
    it('runs without crashing', () => {
      expect(() => xml.createElement('foo')).not.toThrow();
    });
  });

  describe('createNamedElement', () => {
    it('runs without crashing', () => {
      expect(() => xml.createNamedElement('foo')).not.toThrow();
    });
  });

  for (const [name, fn] of Object.entries(xml)) {
    if (!AUTO_CRASH_TEST_SKIP_NAMES.has(name as FnNames)) {
      describe(name, () => {
        it('runs without crashing', () => {
          expect(fn).not.toThrow();
        });
      });
    }
  }
});
