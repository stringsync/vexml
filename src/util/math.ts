/** A slightly more readable version of Math.max that ignores NaN values. */
export const max = (values: number[], initial = 0): number => {
  return Math.max(initial, ...values.filter((value) => !Number.isNaN(value)));
};

/** Sums the values ignoring NaN values. */
export const sum = (values: number[]): number => {
  return values.reduce((sum, value) => sum + value, 0);
};
