import * as spatial from '@/spatial';
import * as events from '@/events';
import * as cursors from '@/cursors';
import * as util from '@/util';
import { LocatorTarget } from './locator';
import { InputType } from './config';

/** Events that vexml dispatches to listeners. */
export type EventMap = {
  click: {
    type: 'click';
    closestTarget: LocatorTarget | null;
    targets: LocatorTarget[];
    point: spatial.Point;
    native: MouseEvent;
  };
  hover: {
    type: 'hover';
    closestTarget: LocatorTarget | null;
    targets: LocatorTarget[];
    point: spatial.Point;
    native: MouseEvent;
  };
  enter: {
    type: 'enter';
    target: LocatorTarget;
    point: spatial.Point;
    native: MouseEvent;
  };
  exit: {
    type: 'exit';
    target: LocatorTarget;
    point: spatial.Point;
    native: MouseEvent;
  };
};

export type EventType = keyof EventMap;

export type AnyEventListener = (event: EventMap[EventType]) => void;
export type ClickEventListener = (event: EventMap['click']) => void;
export type HoverEventListener = (event: EventMap['hover']) => void;
export type EnterEventListener = (event: EventMap['enter']) => void;
export type ExitEventListener = (event: EventMap['exit']) => void;

export class EventMappingFactory {
  private cursor: cursors.PointCursor<LocatorTarget>;
  private topic: events.Topic<EventMap>;

  constructor(cursor: cursors.PointCursor<LocatorTarget>, topic: events.Topic<EventMap>) {
    this.cursor = cursor;
    this.topic = topic;
  }

  create(inputType: InputType): events.EventMapping<events.HostElement, keyof EventMap>[] {
    switch (inputType) {
      case 'mouse':
        return [this.click(), this.hover(), this.enter(), this.exit()];
      case 'touch':
        return [this.click()];
      case 'hybrid':
        return [this.click(), this.hover(), this.enter(), this.exit()];
      case 'auto':
        switch (util.device().inputType) {
          case 'mouseonly':
            return this.create('mouse');
          case 'touchonly':
            return this.create('touch');
          case 'hybrid':
            return this.create('hybrid');
          default:
            return [];
        }
      default:
        return [];
    }
  }

  private click(): events.EventMapping<events.HostElement, 'click'> {
    return {
      vexml: 'click',
      native: {
        click: (event) => {
          const { point, targets, closestTarget } = this.cursor.get(event);
          this.topic.publish('click', { type: 'click', closestTarget, targets, point, native: event });
        },
      },
    };
  }

  private hover(): events.EventMapping<events.HostElement, 'hover'> {
    return {
      vexml: 'hover',
      native: {
        mousemove: (event) => {
          const { point, targets, closestTarget } = this.cursor.get(event);
          this.topic.publish('hover', { type: 'hover', closestTarget, targets, point, native: event });
        },
      },
    };
  }

  private enter(): events.EventMapping<events.HostElement, 'enter'> {
    let lastEvent: MouseEvent | null = null;

    return {
      vexml: 'enter',
      native: {
        mousemove: (event) => {
          lastEvent ??= event;

          const before = this.cursor.get(lastEvent);
          const after = this.cursor.get(event);

          lastEvent = event;

          if (after.closestTarget && before.closestTarget !== after.closestTarget) {
            this.topic.publish('enter', {
              type: 'enter',
              target: after.closestTarget,
              point: after.point,
              native: event,
            });
          }
        },
      },
    };
  }

  private exit(): events.EventMapping<events.HostElement, 'exit'> {
    let lastEvent: MouseEvent | null = null;

    return {
      vexml: 'exit',
      native: {
        mousemove: (event) => {
          lastEvent ??= event;

          const before = this.cursor.get(lastEvent);
          const after = this.cursor.get(event);

          lastEvent = event;

          if (before.closestTarget && before.closestTarget !== after.closestTarget) {
            this.topic.publish('exit', {
              type: 'exit',
              target: before.closestTarget,
              point: before.point,
              native: event,
            });
          }
        },
      },
    };
  }
}
