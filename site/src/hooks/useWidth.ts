import { RefObject, useLayoutEffect, useState } from 'react';
import { debounce } from '../helpers';

export const useWidth = (elementRef: RefObject<HTMLElement>, debounceDelayMs: number): number => {
  const [width, setWidth] = useState(() => elementRef.current?.clientWidth ?? 0);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    setWidth(element.clientWidth);

    const [callback, cancel] = debounce((entries) => {
      setWidth(entries[0].contentRect.width);
    }, debounceDelayMs);

    const resizeObserver = new ResizeObserver(callback);

    resizeObserver.observe(element);

    return () => {
      cancel();
      resizeObserver.disconnect();
    };
  }, [elementRef, debounceDelayMs]);

  return width;
};
