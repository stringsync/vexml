/**
 * Represents a least-recently-used (LRU) cache.
 *
 * When at capacity, this cache will evict the least recently used key-value pair. This is particularly useful if you
 * don't intend a cache to grow in size indefinitely.
 */
export class LRU<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map<K, V>();
  }

  /** Returns the value corresponding to the key, if it exists. Defaults to null. */
  get(key: K): V | null {
    let value = null;
    if (this.has(key)) {
      value = this.map.get(key)!;
      this.map.delete(key);
      this.map.set(key, value as V);
    }
    return value;
  }

  /** Puts the key-value pair, updating how recently "used" a key was used if applicable. */
  put(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, value);

    if (this.map.size > this.capacity) {
      const { value } = this.map.entries().next();
      this.map.delete(value[0]);
    }
  }

  /** Returns whether the key is in the cache. */
  has(key: K): boolean {
    return this.map.has(key);
  }
}
