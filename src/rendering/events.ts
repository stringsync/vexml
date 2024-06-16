import * as spatial from '@/spatial';
import { LocatorTarget } from './locator';

/** Events that vexml dispatches to listeners. */
export type EventMap = {
  click: {
    type: 'click';
    targets: LocatorTarget[];
    point: spatial.Point;
    src: Event;
  };
};

export type ClickEventListener = (event: EventMap['click']) => void;
