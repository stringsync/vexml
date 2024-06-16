import * as spatial from '@/spatial';
import * as events from '@/events';
import * as cursors from '@/cursors';
import * as util from '@/util';
import { LocatorTarget } from './locator';

export type InputType = 'mouse' | 'touch' | 'hybrid' | 'auto' | 'none';

/** Events that vexml dispatches to listeners. */
export type EventMap = {
  click: {
    type: 'click';
    currentTarget: LocatorTarget | null;
    targets: LocatorTarget[];
    point: spatial.Point;
    native: MouseEvent;
  };
};

export type ClickEventListener = (event: EventMap['click']) => void;

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
        return [this.click()];
      case 'touch':
        return [this.click()];
      case 'hybrid':
        return [this.click()];
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
          const { point, targets, currentTarget } = this.cursor.get(event);
          this.topic.publish('click', { type: 'click', currentTarget, targets, point, native: event });
        },
      },
    };
  }
}
