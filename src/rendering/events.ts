import * as spatial from '@/spatial';
import * as events from '@/events';
import * as util from '@/util';
import { InputType } from './types';
import { InteractionModelType } from './interactions';

const LONGPRESS_DURATION_MS = 500;

/** Events that vexml dispatches to listeners. */
export type EventMap = {
  click: {
    type: 'click';
    closestTarget: InteractionModelType;
    targets: InteractionModelType[];
    point: spatial.Point;
    native: MouseEvent | TouchEvent;
  };
  enter: {
    type: 'enter';
    target: InteractionModelType;
    point: spatial.Point;
    native: MouseEvent | TouchEvent;
  };
  exit: {
    type: 'exit';
    target: InteractionModelType;
    point: spatial.Point;
    native: MouseEvent | TouchEvent;
  };
  longpress: {
    type: 'longpress';
    target: InteractionModelType;
    point: spatial.Point;
    native: MouseEvent | TouchEvent;
  };
  scroll: {
    type: 'scroll';
    scrollX: number;
    scrollY: number;
  };
};

export type EventType = keyof EventMap;

export type AnyEventListener = (event: EventMap[EventType]) => void;
export type ClickEventListener = (event: EventMap['click']) => void;
export type EnterEventListener = (event: EventMap['enter']) => void;
export type ExitEventListener = (event: EventMap['exit']) => void;
export type LongpressEventListener = (event: EventMap['longpress']) => void;
export type ScrollEventListener = (event: EventMap['scroll']) => void;

type ClientPoint = {
  clientX: number;
  clientY: number;
};

type LocateResult = {
  point: spatial.Point;
  targets: InteractionModelType[];
  closestTarget: InteractionModelType | null;
};

export class EventMappingFactory {
  private scrollContainer: Element;
  private overlayElement: Element;
  private locator: spatial.PointLocator<InteractionModelType>;
  private topic: events.Topic<EventMap>;

  private constructor(opts: {
    scrollContainer: Element;
    overlayElement: Element;
    locator: spatial.PointLocator<InteractionModelType>;
    topic: events.Topic<EventMap>;
  }) {
    this.scrollContainer = opts.scrollContainer;
    this.overlayElement = opts.overlayElement;
    this.locator = opts.locator;
    this.topic = opts.topic;
  }

  static create(opts: {
    scrollContainer: Element;
    overlayElement: Element;
    inputType: InputType;
    locator: spatial.PointLocator<InteractionModelType>;
    topic: events.Topic<EventMap>;
  }): events.EventMapping<Array<keyof EventMap>>[] {
    return new EventMappingFactory(opts).create(opts.inputType);
  }

  private create(inputType: InputType): events.EventMapping<Array<keyof EventMap>>[] {
    switch (inputType) {
      case 'mouse':
        return [this.mousePress(), this.mouseEgress(), this.scroll()];
      case 'touch':
        return [this.touchPress(), this.touchEgress(), this.scroll()];
      case 'hybrid':
        return [...this.create('mouse'), ...this.create('touch')];
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

  private locate(clientPoint: ClientPoint): LocateResult {
    const rect = this.overlayElement.getBoundingClientRect();
    const x = clientPoint.clientX - rect.left;
    const y = clientPoint.clientY - rect.top;
    const point = new spatial.Point(x, y);

    let targets = this.locator.locate(point);
    targets = this.locator.sort(point, targets);
    const closestTarget = targets[0] ?? null;
    return { point, targets, closestTarget };
  }

  private scroll(): events.EventMapping<['scroll', 'scroll']> {
    return {
      src: 'scroll',
      vexml: ['scroll', 'scroll'],
      native: {
        scroll: () => {
          this.topic.publish('scroll', {
            type: 'scroll',
            scrollX: this.scrollContainer.scrollLeft,
            scrollY: this.scrollContainer.scrollTop,
          });
        },
      },
    };
  }

  private mousePress(): events.EventMapping<['click', 'longpress']> {
    let timeout = 0 as unknown as NodeJS.Timeout;
    let isPending = false;
    let lastMouseDownInvocation = Symbol();

    return {
      src: 'overlay',
      vexml: ['click', 'longpress'],
      native: {
        mousedown: (event) => {
          const mouseDownInvocation = Symbol();

          const { point, closestTarget } = this.locate(event);
          if (!closestTarget) {
            return;
          }

          lastMouseDownInvocation = mouseDownInvocation;
          isPending = true;

          timeout = setTimeout(() => {
            if (lastMouseDownInvocation === mouseDownInvocation) {
              this.topic.publish('longpress', { type: 'longpress', target: closestTarget, point, native: event });
            }
            isPending = false;
          }, LONGPRESS_DURATION_MS);
        },
        mousemove: () => {
          clearTimeout(timeout);
          isPending = false;
        },
        mouseup: (event) => {
          if (isPending) {
            const { point, targets, closestTarget } = this.locate(event);
            if (closestTarget) {
              this.topic.publish('click', { type: 'click', closestTarget, targets, point, native: event });
            }
          }
          clearTimeout(timeout);
          isPending = false;
        },
      },
    };
  }

  private mouseEgress(): events.EventMapping<['enter', 'exit']> {
    let lastResult: LocateResult | null = null;

    return {
      src: 'overlay',
      vexml: ['enter', 'exit'],
      native: {
        mousemove: (event) => {
          const result = this.locate(event);

          if (lastResult && lastResult.closestTarget && lastResult.closestTarget !== result.closestTarget) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.closestTarget,
              point: lastResult.point,
              native: event,
            });
          }
          if (result.closestTarget && result.closestTarget !== lastResult?.closestTarget) {
            this.topic.publish('enter', {
              type: 'enter',
              target: result.closestTarget,
              point: result.point,
              native: event,
            });
          }

          lastResult = result;
        },
      },
    };
  }

  private touchPress(): events.EventMapping<['click', 'longpress']> {
    let timeout = 0 as unknown as NodeJS.Timeout;
    let isPending = false;
    let lastTouchStartInvocation = Symbol();

    return {
      src: 'overlay',
      vexml: ['click', 'longpress'],
      native: {
        touchstart: (event) => {
          const touchStartInvocation = Symbol();

          const { point, closestTarget } = this.locate(event.touches[0]);
          if (!closestTarget) {
            return;
          }

          lastTouchStartInvocation = touchStartInvocation;
          isPending = true;

          timeout = setTimeout(() => {
            if (lastTouchStartInvocation === touchStartInvocation) {
              this.topic.publish('longpress', { type: 'longpress', target: closestTarget, point, native: event });
            }
            isPending = false;
          }, LONGPRESS_DURATION_MS);
        },
        touchmove: () => {
          clearTimeout(timeout);
          isPending = false;
        },
        touchend: (event) => {
          if (isPending) {
            const { point, targets, closestTarget } = this.locate(event.changedTouches[0]);
            if (closestTarget) {
              this.topic.publish('click', { type: 'click', closestTarget, targets, point, native: event });
            }
          }
          clearTimeout(timeout);
          isPending = false;
        },
        touchcancel: () => {
          clearTimeout(timeout);
          isPending = false;
        },
      },
    };
  }

  private touchEgress(): events.EventMapping<['enter', 'exit']> {
    let lastResult: LocateResult | null = null;

    return {
      src: 'overlay',
      vexml: ['enter', 'exit'],
      native: {
        touchmove: (event) => {
          const result = this.locate(event.touches[0]);

          if (lastResult && lastResult.closestTarget && lastResult.closestTarget !== result.closestTarget) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.closestTarget,
              point: lastResult.point,
              native: event,
            });
          }

          if (result.closestTarget && result.closestTarget !== lastResult?.closestTarget) {
            this.topic.publish('enter', {
              type: 'enter',
              target: result.closestTarget,
              point: result.point,
              native: event,
            });

            lastResult = result;
          }
        },
        touchcancel: (event) => {
          if (lastResult?.closestTarget) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.closestTarget,
              point: lastResult.point,
              native: event,
            });

            lastResult = null;
          }
        },
        touchend: (event) => {
          if (lastResult?.closestTarget) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.closestTarget,
              point: lastResult.point,
              native: event,
            });

            lastResult = null;
          }
        },
      },
    };
  }
}
