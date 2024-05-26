import { useCallback, useState } from 'react';

// Adapted from https://usehooks.com/useLocalStorage/
export const useLocalStorage = (
  key: string,
  initialValue: string
): [value: string, setValue: (value: string) => void] => {
  const [stored, setStored] = useState(() => {
    const value = window.localStorage.getItem(key);
    return typeof value === 'string' ? value : initialValue;
  });

  const setValue = useCallback(
    (value: string) => {
      window.localStorage.setItem(key, value);
      setStored(value);
    },
    [key]
  );

  return [stored, setValue];
};
