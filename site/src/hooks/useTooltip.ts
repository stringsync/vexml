import { Tooltip } from 'bootstrap';
import { RefObject, useEffect } from 'react';

export type TooltipPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export const useTooltip = (ref: RefObject<Element>, placement: TooltipPlacement, text: string) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const tooltip = new Tooltip(element, {
      title: text,
      placement,
    });

    return () => {
      tooltip.dispose();
    };
  }, [ref, text, placement]);
};
