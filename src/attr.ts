/** Attr is a wrapper around any arbitrary value that adds functionality to default. */
export class Attr<T> {
  constructor(private value: string | null, private defaultValue: T) {}

  /** Returns a new attr with a different default value. */
  withDefault<T>(defaultValue: T): Attr<T> {
    return new Attr(this.value, defaultValue);
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
  enum<E extends string>(choices: E[]): E | T {
    if (typeof this.value !== 'string') {
      return this.defaultValue;
    }

    const isChoice = (value: any): value is E => choices.includes(value);
    if (isChoice(this.value)) {
      return this.value;
    }

    return this.defaultValue;
  }
}
