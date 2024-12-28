import * as util from '@/util';

/** A map tailored for spanner processing. */
export class SpannerMap<K, V> {
  private map = new Map<K, V[]>();

  /** Makes a spanner that uses a null key, essentially functioning like an array. */
  static keyless<V>() {
    return new SpannerMap<null, V>();
  }

  /** Gets the last value matching the key. */
  get(key: K): V | null {
    return util.last(this.map.get(key) ?? []);
  }

  /** Pushes the value under the key. */
  push(key: K, value: V): void {
    if (!this.map.has(key)) {
      this.map.set(key, []);
    }
    this.map.get(key)!.push(value);
  }

  /** Returns all the values. */
  values(): V[] {
    return Array.from(this.map.values()).flat();
  }
}
