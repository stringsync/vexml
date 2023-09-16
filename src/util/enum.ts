type Values<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

export type EnumValues<T extends Enum<any>> = T extends Enum<infer U> ? Values<U> : never;

/** An enumeration of string values. */
export class Enum<T extends readonly string[]> {
  constructor(public readonly values: T) {}

  /** Type predicate that returns whether or not the value is one of the choices. */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  includes(value: any): value is Values<T> {
    return this.values.includes(value);
  }
}
