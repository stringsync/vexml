/** Checks if a value is a plain JavaScript object (POJO). */
export function isPOJO(value: any): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}

/** Deeply clones a plain JavaScript object. */
export function deepClone<T extends Record<any, any> | Array<any>>(object: T): T {
  if (Array.isArray(object)) {
    return object.map((value) => (isPOJO(value) ? deepClone(value) : value)) as T;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(object)) {
    result[key] = isPOJO(value) || Array.isArray(value) ? deepClone(value) : value;
  }

  return result as T;
}

/** Deeply checks if two plain JavaScript objects are equal. */
export function isEqual(obj1: any, obj2: any): boolean {
  // Check if both objects are null or undefined
  if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
    return obj1 === obj2;
  }

  // Check if both objects are of the same type
  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  // Check if both objects are arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }

    for (let i = 0; i < obj1.length; i++) {
      if (!isEqual(obj1[i], obj2[i])) {
        return false;
      }
    }

    return true;
  }

  // Check if both objects are objects
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!isEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  // Check if both objects are primitive values
  return obj1 === obj2;
}
