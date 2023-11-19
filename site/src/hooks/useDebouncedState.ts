import { useEffect, useState } from 'react';

export const useDebouncedState = <T>(
  initialValue: T,
  delayMs: number
): [value: T, debouncedValue: T, setValue: (value: T) => void] => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delayMs]);

  return [value, debouncedValue, setValue];
};
