import { useCallback, useState } from 'react';

// Adapted from https://usehooks.com/useLocalStorage/
export const useLocalStorage = (key: string, initialValue: string): [string, (value: string) => void] => {
  const [storedValue, setStoredValue] = useState(() => {
    const value = window.localStorage.getItem(key);
    return typeof value === 'string' ? value : initialValue;
  });

  const setValue = useCallback(
    (value: string) => {
      window.localStorage.setItem(key, value);
      setStoredValue(value);
    },
    [key]
  );

  return [storedValue, setValue];
};
