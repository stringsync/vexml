import { useMemo } from 'react';

type Factory<T> = () => T;

export const useConstant = <T>(factory: Factory<T>): T => {
  return useMemo(factory, []);
};
