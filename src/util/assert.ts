export const assertNotNull = <T>(value: T): asserts value is Exclude<T, null> => {
  if (value === null) {
    throw new Error(`expected value to be present, got: ${value}`);
  }
};
