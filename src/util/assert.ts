export const assertNotNil = <T>(value: T | null): asserts value is T => {
  if (value === null || typeof value === 'undefined') {
    throw new Error(`expected value to be present, got: ${value}`);
  }
};
