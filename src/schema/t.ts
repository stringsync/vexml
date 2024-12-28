export type SchemaType<T> = T extends { type: 'string' }
  ? string
  : T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
  ? boolean
  : T extends { type: 'debug'; child: infer S }
  ? SchemaType<S>
  : T extends { type: 'enum'; choices: Readonly<Array<infer S>> }
  ? S
  : never;

export type Config<T extends Record<any, any>> = {
  [K in keyof T]: SchemaType<T[K]>;
};

type TerminalSchemaDescriptor = ReturnType<typeof t.string | typeof t.number | typeof t.boolean | typeof t.enum>;

export type SchemaDescriptor = ReturnType<
  typeof t.string | typeof t.number | typeof t.boolean | typeof t.enum | typeof t.debug
>;

export type AnySchema = Record<string, SchemaDescriptor>;

/** A class for creating schema types. */
export class t {
  static defaultConfig<T extends AnySchema>(schema: T): Config<T> {
    const value = <T extends SchemaDescriptor>(descriptor: T): SchemaType<T> => {
      switch (descriptor.type) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'enum':
          return descriptor.defaultValue as SchemaType<T>;
        case 'debug':
          return value(descriptor.child) as SchemaType<T>;
      }
    };

    const config: any = {};
    for (const key in schema) {
      config[key] = value(schema[key]);
    }
    return config;
  }

  static string(opts: { defaultValue: string; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'string', defaultValue, help } as const;
  }

  static number(opts: { defaultValue: number; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'number', defaultValue, help } as const;
  }

  static boolean(opts: { defaultValue: boolean; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'boolean', defaultValue, help } as const;
  }

  static enum<T extends readonly [string, ...string[]]>(opts: { choices: T; defaultValue: T[0]; help: string }) {
    const defaultValue = opts.defaultValue;
    const help = opts.help;
    return { type: 'enum', choices: opts.choices, defaultValue, help } as const;
  }

  static debug<T extends TerminalSchemaDescriptor>(opts: { child: T; help: string }) {
    const help = opts.help;
    return { type: 'debug', child: opts.child, help } as const;
  }

  private constructor() {
    throw new Error('cannot instantiate t');
  }
}
