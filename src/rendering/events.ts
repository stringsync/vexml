import * as spatial from '@/spatial';

/** Events that vexml dispatches to listeners. */
export type Events = {
  click: { type: 'click'; targets: any[]; point: spatial.Point; src: Event };
};

export type ClickEventListener = (event: Events['click']) => void;
