import * as spatial from '@/spatial';
import * as events from '@/events';
import * as util from '@/util';
import * as playback from '@/playback';
import * as components from '@/components';
import { Locator } from './locator';
import { EventMap } from './types';
import { InputType } from '@/rendering';
import { VexmlElement } from './types';

const MOUSEDOWN_MOVEMENT_TOLERANCE = 10;
const LONGPRESS_DURATION_MS = 500;

type ClientPoint = {
  clientX: number;
  clientY: number;
};

type LocateResult = {
  point: spatial.Point;
  target: VexmlElement | null;
  timestampMs: number | null;
};

export class EventMappingFactory {
  private constructor(
    private root: components.Root,
    private elementLocator: Locator,
    private timestampLocator: playback.TimestampLocator,
    private topic: events.Topic<EventMap>
  ) {}

  static create(
    root: components.Root,
    elementLocator: Locator,
    timestampLocator: playback.TimestampLocator,
    topic: events.Topic<EventMap>,
    inputType: InputType
  ): events.EventMapping<Array<keyof EventMap>>[] {
    return new EventMappingFactory(root, elementLocator, timestampLocator, topic).create(inputType);
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
    const point = this.point(clientPoint);

    const targets = this.elementLocator.locate(point);
    const closestTarget = targets[0] ?? null;

    const timestampMs = this.timestampLocator.locate(point)?.ms ?? null;

    return { point, target: closestTarget, timestampMs };
  }

  private point(clientPoint: ClientPoint): spatial.Point {
    const rect = this.root.getOverlay().getElement().getBoundingClientRect();
    const x = clientPoint.clientX - rect.left;
    const y = clientPoint.clientY - rect.top;
    return new spatial.Point(x, y);
  }

  private scroll(): events.EventMapping<['scroll', 'scroll']> {
    const scrollContainer = this.root.getScrollContainer();

    return {
      src: 'scroll',
      vexml: ['scroll', 'scroll'],
      native: {
        scroll: (event) => {
          this.topic.publish('scroll', {
            type: 'scroll',
            scrollX: scrollContainer.scrollLeft,
            scrollY: scrollContainer.scrollTop,
            native: event,
          });
        },
      },
    };
  }

  private mousePress(): events.EventMapping<['click', 'longpress']> {
    let timeout = 0 as unknown as NodeJS.Timeout;
    let lastMouseDownInvocation = Symbol();
    let lastMouseDownPoint = spatial.Point.origin();
    let isPending = false;

    return {
      src: 'overlay',
      vexml: ['click', 'longpress'],
      native: {
        mousedown: (event) => {
          const mouseDownInvocation = Symbol();

          const { point, target: closestTarget, timestampMs } = this.locate(event);
          if (!closestTarget) {
            return;
          }

          lastMouseDownInvocation = mouseDownInvocation;
          lastMouseDownPoint = point;
          isPending = true;

          timeout = setTimeout(() => {
            if (lastMouseDownInvocation === mouseDownInvocation) {
              this.topic.publish('longpress', {
                type: 'longpress',
                target: closestTarget,
                point,
                native: event,
                timestampMs,
              });
            }
            isPending = false;
          }, LONGPRESS_DURATION_MS);
        },
        mousemove: (event) => {
          if (isPending && lastMouseDownPoint.distance(this.point(event)) > MOUSEDOWN_MOVEMENT_TOLERANCE) {
            clearTimeout(timeout);
            isPending = false;
          }
        },
        mouseup: (event) => {
          if (isPending) {
            const { point, target: closestTarget, timestampMs } = this.locate(event);
            if (closestTarget) {
              this.topic.publish('click', { type: 'click', target: closestTarget, point, native: event, timestampMs });
            }
          }
          clearTimeout(timeout);
          lastMouseDownInvocation = Symbol();
          lastMouseDownPoint = spatial.Point.origin();
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

          if (lastResult && lastResult.target && lastResult.target !== result.target) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.target,
              point: lastResult.point,
              native: event,
              timestampMs: lastResult.timestampMs,
            });
          }
          if (result.target && result.target !== lastResult?.target) {
            this.topic.publish('enter', {
              type: 'enter',
              target: result.target,
              point: result.point,
              native: event,
              timestampMs: result.timestampMs,
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

          const { point, target: closestTarget, timestampMs } = this.locate(event.touches[0]);
          if (!closestTarget) {
            return;
          }

          lastTouchStartInvocation = touchStartInvocation;
          isPending = true;

          timeout = setTimeout(() => {
            if (lastTouchStartInvocation === touchStartInvocation) {
              this.topic.publish('longpress', {
                type: 'longpress',
                target: closestTarget,
                point,
                native: event,
                timestampMs,
              });
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
            const { point, target: closestTarget, timestampMs } = this.locate(event.changedTouches[0]);
            if (closestTarget) {
              this.topic.publish('click', { type: 'click', target: closestTarget, point, native: event, timestampMs });
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

          if (lastResult && lastResult.target && lastResult.target !== result.target) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.target,
              point: lastResult.point,
              native: event,
              timestampMs: lastResult.timestampMs,
            });
          }

          if (result.target && result.target !== lastResult?.target) {
            this.topic.publish('enter', {
              type: 'enter',
              target: result.target,
              point: result.point,
              native: event,
              timestampMs: result.timestampMs,
            });

            lastResult = result;
          }
        },
        touchcancel: (event) => {
          if (lastResult?.target) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.target,
              point: lastResult.point,
              native: event,
              timestampMs: lastResult.timestampMs,
            });

            lastResult = null;
          }
        },
        touchend: (event) => {
          if (lastResult?.target) {
            this.topic.publish('exit', {
              type: 'exit',
              target: lastResult.target,
              point: lastResult.point,
              native: event,
              timestampMs: lastResult.timestampMs,
            });

            lastResult = null;
          }
        },
      },
    };
  }
}
