import { RefObject, useLayoutEffect } from 'react';
import { useDebouncedState } from './useDebouncedState';

export const useWidth = (elementRef: RefObject<HTMLElement>, debounceDelayMs: number): number => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, debouncedWidth, setWidth] = useDebouncedState(elementRef.current?.clientWidth ?? 0, debounceDelayMs);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    setWidth(element.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef, setWidth]);

  return debouncedWidth;
};
