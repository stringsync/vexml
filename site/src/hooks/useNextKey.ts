import { useCallback, useRef } from 'react';

export const useNextKey = (prefix: string) => {
  const index = useRef(0);
  const nextKey = useCallback(() => `${prefix}-${index.current++}`, [prefix]);
  return nextKey;
};
