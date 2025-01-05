export type SchemaType<T> = T extends { type: 'string'; defaultValue: infer D }
  ? string | D
  : T extends { type: 'number'; defaultValue: infer D }
  ? number | D
  : T extends { type: 'boolean'; defaultValue: infer D }
  ? boolean | D
  : T extends { type: 'enum'; choices: Readonly<Array<infer S>>; defaultValue: infer D }
  ? S | D
  : never;

export type SchemaConfig<T extends Record<any, any>> = {
  [K in keyof T]: SchemaType<T[K]>;
};

export type SchemaDescriptor = ReturnType<typeof t.string | typeof t.number | typeof t.boolean | typeof t.enum>;

export type AnySchema = Record<string, SchemaDescriptor>;

/** A class for creating schema types. */
export class t {
  static defaultConfig<T extends AnySchema>(schema: T): SchemaConfig<T> {
    const config: any = {};
    for (const key in schema) {
      config[key] = schema[key].defaultValue;
    }
    return config;
  }

  static string<D extends string | null>(opts: { defaultValue: D; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'string', defaultValue, help } as const;
  }

  static number<D extends number | null>(opts: { defaultValue: D; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'number', defaultValue, help } as const;
  }

  static boolean<D extends boolean | null>(opts: { defaultValue: D; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'boolean', defaultValue, help } as const;
  }

  static enum<T extends readonly [string, ...string[]], D extends T[number] | null>(opts: {
    choices: T;
    defaultValue: D;
    help: string;
  }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'enum', choices: opts.choices, defaultValue, help } as const;
  }

  private constructor() {
    throw new Error('cannot instantiate t');
  }
}
