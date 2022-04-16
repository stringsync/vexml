// from https://github.com/stringsync/stringsync/blob/e0611f57165e72312538f631ee642e7a0e9e268b/web/src/hooks/useLocalStorage.ts
import { useCallback, useState } from 'react';

type FlatSerializable = {
  [key: string]: string | number | boolean | null;
};

const isType = <T extends FlatSerializable>(target: T, obj: any): obj is T => {
  if (typeof obj !== 'object') {
    return false;
  }

  for (const [k, v] of Object.entries(obj)) {
    if (!(k in target)) {
      return false;
    }
    if (typeof target[k] !== typeof v) {
      return false;
    }
  }

  return true;
};

/**
 * Merges only the keys that exist in the dst object iff the corresponding value types match. This
 * excludes any extra keys, but preserves the values in src. This is particularly useful when the
 * src object schema's change, and you want to make a best effort to keep the compatible key-values
 * that already exist.
 */
const sanitize = <T extends FlatSerializable>(target: T, obj: any) => {
  const sanitized = { ...target };

  if (typeof obj !== 'object') {
    return sanitized;
  }

  for (const [k, v] of Object.entries(target)) {
    if (!(k in obj)) {
      continue;
    }
    if (typeof obj[k] === typeof v) {
      (sanitized as FlatSerializable)[k] = obj[k];
    }
  }

  return sanitized;
};

// Adapted from https://usehooks.com/useLocalStorage/
export const useLocalStorage = <T extends FlatSerializable>(
  key: string,
  initialValue: Readonly<T>
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsedValue = item ? JSON.parse(item) : initialValue;
      return isType(initialValue, parsedValue) ? parsedValue : sanitize(initialValue, parsedValue);
    } catch (error) {
      console.error(error);
      return { ...initialValue };
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(sanitize(initialValue, value));
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(error);
      }
    },
    [initialValue, key]
  );

  return [storedValue, setValue];
};
