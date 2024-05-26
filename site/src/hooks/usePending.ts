import { useCallback, useState } from 'react';

export const usePending = () => {
  const [count, setCount] = useState(0);

  const isPending = count > 0;

  const withPending = useCallback(async (task: () => void | Promise<void>) => {
    setCount((count) => count + 1);
    try {
      await task();
    } finally {
      setCount((count) => count - 1);
    }
  }, []);

  return [isPending, withPending] as const;
};
