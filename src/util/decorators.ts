import { LRU } from './lru';

/**
 * Memoizes a method.
 *
 * This decorator is backed by an LRU cache to avoid memory leaks. Each argument provided can yield another LRU true if
 * there are arguments after it. The `degree` parameter is the capacity of each LRU cache "level". It must be declared
 * statically.
 *
 * NOTE: LRU caches depend on _identity_ for indexing. If you need values to resolve based on _equivalency_, do not use
 * this decorator.
 */
export function memoize(opts: { degree: number } = { degree: 1 }): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value;

    // Using symbols to ensure uniqueness and avoid potential property name collisions
    const cacheSymbol = Symbol(`cache_${String(propertyKey)}`);

    descriptor.value = function (...args: any[]) {
      // Sidestep TypeScript typings.
      const self = this as any;

      self[cacheSymbol] ??= new LRU(opts.degree);

      let node: LRU<any, any> = self[cacheSymbol];
      const depth = args.length;

      // When there are no args, we don't need to traverse the LRU tree. However, we do need to store a key in the root
      // map in case the function is variadic.
      if (depth === 0) {
        if (!node.has(depth)) {
          node.put(depth, originalMethod.apply(self, args));
        }
        return node.get(depth);
      }

      // We need to traverse the LRU tree, starting with the argument length as a namespace. This takes up more space,
      // but it prevents unintentional exposure of the underlying LRU caches.
      let value;

      if (!node.has(depth)) {
        node.put(depth, new LRU(opts.degree));
      }
      node = node.get(depth);

      for (let index = 0; index < depth; index++) {
        const arg = args[index];
        const isLast = index === depth - 1;

        if (isLast) {
          // We're on the last arg, so now is the time to check the value.
          if (!node.has(arg)) {
            node.put(arg, originalMethod.apply(self, args));
          }
          value = node.get(arg);
        } else {
          // We still have other args, so we'll create a new LRU to memoize them.
          if (!node.has(arg)) {
            node.put(arg, new LRU(opts.degree));
          }
          node = node.get(arg);
        }
      }

      return value;
    };

    return descriptor;
  };
}
