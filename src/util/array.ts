/** Returns the first element of an array or null if it doesn't exist. */
export const first = <T>(array: T[]): T | null => array[0] ?? null;

/** Returns the last element of an array or null if it doesn't exist. */
export const last = <T>(array: T[]): T | null => array[array.length - 1] ?? null;

/** Sorts in-place using the transformation of each array item. */
export const sortBy = <T, S>(array: T[], transform: (item: T) => S): T[] => {
  const memo = new Map<T, S>();

  const value = (item: T): S => {
    if (!memo.has(item)) {
      memo.set(item, transform(item));
    }
    return memo.get(item)!;
  };

  return array.sort((a, b) => {
    const valueA = value(a);
    const valueB = value(b);

    if (valueA > valueB) {
      return 1;
    }
    if (valueA < valueB) {
      return -1;
    }
    return 0;
  });
};

/** Groups the elements in the array using the transform. */
export const groupBy = <T, S extends string | number | symbol>(
  array: T[],
  transform: (item: T) => S
): Record<S, T[]> => {
  return array.reduce((memo, item) => {
    const key = transform(item);
    memo[key] ??= [];
    memo[key].push(item);
    return memo;
  }, {} as Record<S, T[]>);
};

/** Iterates over each [previous, current, next] triple. */
export const forEachTriple = <T>(
  array: T[],
  callback: (
    triple: [previous: T | null, current: T, next: T | null],
    meta: { index: number; isFirst: boolean; isLast: boolean }
  ) => void
): void => {
  for (let index = 0; index < array.length; index++) {
    const previous = array[index - 1] ?? null;
    const current = array[index];
    const next = array[index + 1] ?? null;
    callback([previous, current, next], { index, isFirst: index === 0, isLast: index === array.length - 1 });
  }
};

/** Returns a new array with unique elements, preserving the order. */
export const unique = <T>(array: T[]): T[] => {
  const seen = new Set<T>();
  return array.filter((item) => {
    if (seen.has(item)) {
      return false;
    }
    seen.add(item);
    return true;
  });
};

/** Returns a new array with unique elements based on the transformation, preserving the order. */
export const uniqueBy = <T, S>(array: T[], transform: (item: T) => S): T[] => {
  const seen = new Set<S>();
  return array.filter((item) => {
    const key = transform(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
