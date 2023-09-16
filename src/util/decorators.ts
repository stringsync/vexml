export function memoize(): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value;

    let isCached = false;
    let cachedResult: any;

    descriptor.value = function (...args: any[]) {
      if (args.length > 0) {
        throw new Error(`cannot memoize a function that takes arguments`);
      }
      if (!isCached) {
        cachedResult = originalMethod.call(this);
        isCached = true;
      }
      return cachedResult;
    };

    return descriptor;
  };
}
