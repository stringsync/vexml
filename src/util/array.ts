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
