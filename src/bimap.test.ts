import { BiMap, BiMapError } from './bimap';

describe('BiMap', () => {
  describe('create', () => {
    it('instantiates a new BiMap', () => {
      const map1 = BiMap.create();
      const map2 = BiMap.create();
      expect(map1).not.toBe(map2);
    });
  });

  describe('set', () => {
    it('sets the value for the regular and inverse maps', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};

      map.set(key, val);

      expect(map.get(key)).toBe(val);
      expect(map.invert().get(val)).toBe(key);
    });

    it('disallows setting a value multiple times', () => {
      const map = BiMap.create();
      const key1 = {};
      const key2 = {};
      const val = {};

      map.set(key1, val);
      expect(() => map.set(key2, val)).toThrow(BiMapError);

      expect(map.get(key1)).toBe(val);
      expect(map.invert().get(val)).toBe(key1);
      expect(map.has(key2)).toBeFalse();
    });

    it('allows setting a key multiple times', () => {
      const map = BiMap.create();
      const key = {};
      const val1 = {};
      const val2 = {};

      map.set(key, val1);
      map.set(key, val2);

      expect(map.get(key)).toBe(val2);
      expect(map.invert().get(val2)).toBe(key);
      expect(map.invert().has(val1)).toBeFalse();
    });
  });
});
