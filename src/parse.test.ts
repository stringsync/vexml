import * as parse from './parse';

describe('parse', () => {
  describe('intOrDefault', () => {
    it('parses strings into integers', () => {
      const result = parse.intOrDefault('42', 43);
      expect(result).toBe(42);
    });

    it('leaves integers intact', () => {
      const result = parse.intOrDefault(42, 43);
      expect(result).toBe(42);
    });

    it('truncates decimals', () => {
      const result = parse.intOrDefault(42.2222, 43);
      expect(result).toBe(42);
    });

    it('defaults when given NaN', () => {
      const result = parse.intOrDefault(NaN, 42);
      expect(result).toBe(42);
    });

    it('parses decimals by truncating them', () => {
      const result = parse.intOrDefault('42.999999', 43);
      expect(result).toBe(42);
    });

    it('defaults when given invalid strings', () => {
      const result = parse.intOrDefault('foo', 42);
      expect(result).toBe(42);
    });

    it('defaults when given a non string', () => {
      const result = parse.intOrDefault({}, 42);
      expect(result).toBe(42);
    });
  });
});
