import { Enum } from '@/util';

describe(Enum, () => {
  describe('includes', () => {
    const METASYNTATIC_VARIABLES = new Enum(['foo', 'bar', 'baz']);

    it('returns true when the value is part of the values', () => {
      const result = METASYNTATIC_VARIABLES.includes('foo');
      expect(result).toBeTrue();
    });

    it('returns false when the value is not part of the values', () => {
      const result = METASYNTATIC_VARIABLES.includes('hello world');
      expect(result).toBeFalse();
    });
  });
});
