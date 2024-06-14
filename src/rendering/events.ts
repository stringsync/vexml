import * as spatial from '@/spatial';
import { LocatorTarget } from './locator';

/** Events that vexml dispatches to listeners. */
export type Events = {
  click: {
    type: 'click';
    targets: LocatorTarget[];
    point: spatial.Point;
    src: Event;
  };
};

export type ClickEventListener = (event: Events['click']) => void;
