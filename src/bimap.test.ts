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

  describe('get', () => {
    it('returns the value when the key exists', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      expect(map.get(key)).toBe(val);
      expect(map.invert().get(val)).toBe(key);
    });

    it('returns undefined when the key does not exist', () => {
      const map = BiMap.create();

      expect(map.get({})).toBeUndefined();
      expect(map.invert().has(undefined)).toBeFalse();
    });

    it('can return undefined if the key was explicitly set to it', () => {
      const map = BiMap.create();
      const key = {};
      map.set(key, undefined);

      expect(map.get(key)).toBeUndefined();
      expect(map.invert().has(undefined)).toBeTrue();
      expect(map.invert().get(undefined)).toBe(key);
    });
  });

  describe('delete', () => {
    it('deletes entries from both maps when using key', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      const result = map.delete(key);

      expect(result).toBeTrue();
      expect(map.has(key)).toBeFalse();
      expect(map.invert().has(val)).toBeFalse();
    });

    it('deletes entries from both maps when using val', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      const result = map.invert().delete(val);

      expect(result).toBeTrue();
      expect(map.has(key)).toBeFalse();
      expect(map.invert().has(val)).toBeFalse();
    });

    it('does not delete when using val on forward map', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      const result = map.delete(val);

      expect(result).toBeFalse();
      expect(map.has(key)).toBeTrue();
      expect(map.invert().has(val)).toBeTrue();
    });
  });

  describe('has', () => {
    it('returns true when the map has the key', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      expect(map.has(key)).toBeTrue();
      expect(map.invert().has(val)).toBeTrue();
    });

    it('returns false when the map does not have the key', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      expect(map.has(val)).toBeFalse();
      expect(map.invert().has(key)).toBeFalse();
    });
  });

  describe('invert', () => {
    it('returns the inverse map', () => {
      const map = BiMap.create();
      const key = {};
      const val = {};
      map.set(key, val);

      expect(map.invert().has(val)).toBeTrue();
      expect(map.invert().get(val)).toBe(key);
    });
  });
});
