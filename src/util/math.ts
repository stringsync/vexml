/** A slightly more readable version of Math.max that ignores NaN values. */
export const max = (values: number[], initial = 0): number => {
  return Math.max(initial, ...values.filter((value) => !Number.isNaN(value)));
};

/** A slightly more readable version of Math.min that ignores NaN values. */
export const min = (values: number[], initial = 0): number => {
  return Math.min(initial, ...values.filter((value) => !Number.isNaN(value)));
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

/** Returns the greatest common denominator. */
export const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

/** Returns the least common mulitple between the numbers. */
export const lcm = (a: number, b: number): number => {
  return (a * b) / gcd(a, b);
};

/** Interpolates between a and b. */
export const lerp = (a: number, b: number, alpha: number): number => {
  alpha = clamp(0, 1, alpha);
  return a + (b - a) * alpha;
};
