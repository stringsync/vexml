import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export const useJsonLocalStorage = <T extends Json>(
  key: string,
  initialValue: T,
  typeGuard: (data: unknown) => data is T
): [value: T, setValue: (value: T) => void] => {
  const [stored, setStored] = useLocalStorage(key, JSON.stringify(initialValue));

  const data = JSON.parse(stored);
  const value = typeGuard(data) ? data : initialValue;

  const setValue = useCallback(
    (value: T) => {
      setStored(JSON.stringify(value));
    },
    [setStored]
  );

  return [value, setValue];
};
