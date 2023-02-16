/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * Parses the value and returns the default value if there are any problems.
 */
export const intOrDefault = (value: any, defaultValue: number): number => {
  if (Number.isInteger(value)) {
    return value;
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
