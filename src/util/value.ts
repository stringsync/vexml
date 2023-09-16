import { Enum, EnumValues } from './enum';

/**
 * Value is a wrapper around any arbitrary value that adds functionality to default.
 */
export class Value<T> {
  private constructor(private value: string | null, private defaultValue: T) {}

  static of(value: string | null): Value<null> {
    return new Value(value, null);
  }

  /** Returns a new attr with a different default value. */
  withDefault<T>(defaultValue: T): Value<T> {
    return new Value(this.value, defaultValue);
  }

  /** Parses the attribute into a string. */
  str(): string | T {
    return this.value ?? this.defaultValue;
  }

  /** Parses the attribute into a boolean. */
  bool(): boolean | T {
    switch (this.value) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return this.defaultValue;
    }
  }

  /** Parses the attribute into an integer. */
  int(): number | T {
    if (typeof this.value !== 'string') {
      return this.defaultValue;
    }

    const result = parseInt(this.value, 10);
    if (isNaN(result)) {
      return this.defaultValue;
    }

    return result;
  }

  /** Parses the attribute into a float. */
  float(): number | T {
    if (typeof this.value !== 'string') {
      return this.defaultValue;
    }

    const result = parseFloat(this.value);
    if (isNaN(result)) {
      return this.defaultValue;
    }

    return result;
  }

  /** Parses the attribute into an enum. */
  enum<E extends Enum<any>>(e: E): T | EnumValues<E> {
    if (typeof this.value !== 'string') {
      return this.defaultValue;
    }

    if (e.includes(this.value)) {
      return this.value as EnumValues<E>;
    }

    return this.defaultValue;
  }
}
