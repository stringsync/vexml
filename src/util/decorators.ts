export function memoize(): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value;

    // Using symbols to ensure uniqueness and avoid potential property name collisions
    const isCachedSymbol = Symbol(`isCached_${String(propertyKey)}`);
    const cachedResultSymbol = Symbol(`cachedResult_${String(propertyKey)}`);

    descriptor.value = function (...args: any[]) {
      if (args.length > 0) {
        throw new Error(`cannot memoize a function that takes arguments`);
      }

      // Sidestep TypeScript typings.
      const self = this as any;

      if (!self[isCachedSymbol]) {
        self[cachedResultSymbol] = originalMethod.call(self);
        self[isCachedSymbol] = true;
      }
      return self[cachedResultSymbol];
    };

    return descriptor;
  };
}
