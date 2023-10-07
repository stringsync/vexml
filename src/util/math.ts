/** A slightly more readable version of Math.max that ignores NaN values. */
export const max = (values: number[], initial = 0): number => {
  return Math.max(initial, ...values.filter((value) => !Number.isNaN(value)));
};

/** Ensures a number is within a range. */
export const clamp = (min: number, max: number, value: number): number => {
  if (Number.isNaN(min) || Number.isNaN(max)) {
    throw new Error('min and max must not be NaN');
  }
  if (min > max) {
    throw new Error('min must be <= max');
  }

  value = Number.isNaN(value) ? min : value;

  return Math.min(max, Math.max(min, value));
};

/** Computes the sum of the numbers, filtering out NaNs. */
export const sum = (values: number[], initial = 0): number => {
  return values.filter((value) => !Number.isNaN(value)).reduce((sum, value) => sum + value, initial);
};
