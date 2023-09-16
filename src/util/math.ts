/** A slightly more readable version of Math.max that ignores NaN values. */
export const max = (values: number[], initial = 0): number => {
  return Math.max(initial, ...values.filter((value) => !Number.isNaN(value)));
};

/** Sums the values ignoring NaN values. */
export const sum = (values: number[]): number => {
  return values.reduce((sum, value) => sum + value, 0);
};

/** Ensures a number is within a range. */
export const clamp = (min: number, max: number, value: number): number => {
  if (Number.isNaN(min) || Number.isNaN(max)) {
    throw new Error(`min and max must not be NaN`);
  }

  value = Number.isNaN(value) ? min : value;

  return Math.min(max, Math.max(min, value));
};
