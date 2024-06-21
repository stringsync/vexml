import { RefObject, useLayoutEffect, useState } from 'react';

export const useWidth = (elementRef: RefObject<HTMLElement>): number => {
  const [width, setWidth] = useState(0);

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
  }, [elementRef]);

  return width;
};
