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

/** Iterates over each [previous, current, next] triple. */
export const forEachTriple = <T>(
  array: T[],
  callback: (triple: [previous: T | null, current: T, next: T | null]) => void
): void => {
  for (let index = 0; index < array.length; index++) {
    const previous = array[index - 1] ?? null;
    const current = array[index];
    const next = array[index + 1] ?? null;
    callback([previous, current, next]);
  }
};
