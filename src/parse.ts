/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * Parses the value and returns the default value if there are any problems.
 */
export const intOrDefault = <T>(value: any, defaultValue: T): number | T => {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== 'string') {
    return defaultValue;
  }

  const result = parseInt(value, 10);
  if (isNaN(result)) {
    return defaultValue;
  }

  return result;
};
