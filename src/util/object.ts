/** Checks if a value is a plain JavaScript object (POJO). */
export function isPOJO(value: any): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}

/** Deeply clones a plain JavaScript object. */
export function deepClone<T extends Record<any, any> | Array<any>>(object: T): T {
  if (!isPOJO(object)) {
    throw new Error('Input must be a plain JavaScript object');
  }

  if (Array.isArray(object)) {
    return object.map((value) => (isPOJO(value) ? deepClone(value) : value)) as T;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(object)) {
    result[key] = isPOJO(value) ? deepClone(value) : value;
  }

  return result as T;
}
