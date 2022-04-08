export class BiMapError extends Error {}

export class BiMap<K, V> {
  static create<K, V>(): BiMap<K, V> {
    return new BiMap<K, V>(new Map(), new Map());
  }

  private forward: Map<K, V>;
  private backward: Map<V, K>;
  private inverse: BiMap<V, K>;

  private constructor(forward: Map<K, V>, backward: Map<V, K>, inverse?: BiMap<V, K>) {
    this.forward = forward;
    this.backward = backward;
    this.inverse = inverse ?? new BiMap(backward, forward, this);
  }

  set(key: K, value: V): void {
    if (this.inverse.has(value)) {
      throw new BiMapError(`value already present, cannot set: ${key}, ${value}`);
    }
    if (this.has(key)) {
      this.delete(key);
    }
    this.forward.set(key, value);
    this.backward.set(value, key);
  }

  get(key: K): V | undefined {
    return this.forward.get(key);
  }

  delete(key: K): boolean {
    if (!this.has(key)) {
      return false;
    }
    const value = this.get(key)!;
    this.forward.delete(key);
    this.backward.delete(value);
    return true;
  }

  has(key: K): boolean {
    return this.forward.has(key);
  }

  invert(): BiMap<V, K> {
    return this.inverse;
  }
}
