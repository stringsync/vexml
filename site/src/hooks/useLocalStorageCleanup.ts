import { useEffect } from 'react';

export const useLocalStorageCleanup = (removeKeys: string[]) => {
  useEffect(() => {
    for (const key of removeKeys) {
      localStorage.removeItem(key);
    }
  }, [removeKeys]);
};
