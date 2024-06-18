export type SchemaType<T> = T extends { type: 'string' }
  ? string
  : T extends { type: 'number' }
  ? number
  : T extends { type: 'boolean' }
  ? boolean
  : T extends { type: 'debug'; child: infer S }
  ? SchemaType<S>
  : T extends { type: 'enum'; choices: Array<infer S> }
  ? S
  : never;

export type SchemaConfig<T extends Record<any, any>> = {
  [K in keyof T]: SchemaType<T[K]>;
};

export type AnySchemaDescriptor = { type: string };

export type SchemaDescriptor = ReturnType<
  typeof t.string | typeof t.number | typeof t.boolean | typeof t.enum | typeof t.debug
>;

export type AnySchema = Record<string, SchemaDescriptor>;

/** A class for creating schema types. */
export class t {
  static defaultConfig<T extends AnySchema>(schema: T): SchemaConfig<T> {
    const value = <T extends SchemaDescriptor>(descriptor: T): SchemaType<T> => {
      switch (descriptor.type) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'enum':
          return descriptor.defaultValue as SchemaType<T>;
        case 'debug':
          return value(descriptor.child as SchemaDescriptor) as SchemaType<T>;
      }
    };

    const config: any = {};
    for (const key in schema) {
      config[key] = value(schema[key]);
    }
    return config;
  }

  static string(defaultValue: string = '') {
    return { type: 'string', defaultValue } as const;
  }

  static number(defaultValue: number = 0) {
    return { type: 'number', defaultValue } as const;
  }

  static boolean(defaultValue: boolean = false) {
    return { type: 'boolean', defaultValue } as const;
  }

  static enum<T extends readonly [string, ...string[]]>(choices: T, defaultValue = choices[0]) {
    return { type: 'enum', choices, defaultValue } as const;
  }

  static debug<T extends AnySchemaDescriptor>(child: T) {
    return { type: 'debug', child } as const;
  }

  private constructor() {
    throw new Error('cannot instantiate t');
  }
}
