import { LRU } from '@/util';

describe(LRU, () => {
  describe('get', () => {
    it('returns the value corresponding to the key', () => {
      const lru = new LRU(1);
      lru.put(1, 1);
      expect(lru.get(1)).toBe(1);
    });

    it('defaults to null', () => {
      const lru = new LRU(1);
      expect(lru.get(1)).toBeNull();
    });

    it('refreshes the LRU order of the keys', () => {
      const lru = new LRU(2);
      lru.put(1, 1);
      lru.put(2, 2);
      lru.get(1);
      lru.put(3, 3);

      expect(lru.has(1)).toBeTrue();
      expect(lru.has(2)).toBeFalse();
      expect(lru.has(3)).toBeTrue();
    });
  });

  describe('put', () => {
    it('puts the key into the cache', () => {
      const lru = new LRU(1);
      lru.put(1, 1);

      expect(lru.has(1)).toBeTrue();
    });

    it('resets the LRU order of the keys', () => {
      const lru = new LRU(2);
      lru.put(1, 1);
      lru.put(2, 2);
      lru.put(3, 3);

      expect(lru.has(1)).toBeFalse();
      expect(lru.has(2)).toBeTrue();
      expect(lru.has(3)).toBeTrue();
    });

    it('overrides keys that already exist', () => {
      const lru = new LRU(1);
      lru.put(1, 1);
      lru.put(1, 2);

      expect(lru.has(1)).toBeTrue();
      expect(lru.get(1)).toBe(2);
    });

    it('accepts objects as keys', () => {
      const lru = new LRU(1);
      const key = {};

      lru.put(key, 1);

      expect(lru.get(key)).toBe(1);
    });
  });

  describe('has', () => {
    it('returns true when the key is in the cache', () => {
      const lru = new LRU(1);
      lru.put(1, 1);
      expect(lru.has(1)).toBeTrue();
    });

    it('returns false when the key was never in the cache', () => {
      const lru = new LRU(1);
      expect(lru.has(1)).toBeFalse();
    });

    it('returns false when the key was evicted', () => {
      const lru = new LRU(1);
      lru.put(1, 1);
      lru.put(2, 2);
      expect(lru.has(1)).toBeFalse();
    });
  });
});
