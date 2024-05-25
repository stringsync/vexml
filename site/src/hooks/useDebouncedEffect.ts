import { useEffect } from 'react';

export const useDebouncedEffect = <T>(value: T, effect: () => void, delayMs: number) => {
  useEffect(() => {
    const timer = setTimeout(effect, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, effect, delayMs]);
};
