import * as util from '@/util';
import * as cursors from '@/cursors';
import * as spatial from '@/spatial';
import { Topic, Callback } from '@/events';
import { ScoreRendering } from './score';

export type RenderingEvents = {
  click: { targets: any[]; point: spatial.Point; src: Event };
};

const MOVE_THROTTLE_MS = 30;
const MOUSE_EVENT_NAMES = ['mousedown', 'mousemove', 'mouseup'] as const;
const TOUCH_EVENT_NAMES = ['touchstart', 'touchmove', 'touchend'] as const;

let EVENT_NAMES = new Array<keyof HTMLElementEventMap>();
switch (util.device.inputType) {
  case 'mouseonly':
    EVENT_NAMES = [...MOUSE_EVENT_NAMES];
    break;
  case 'touchonly':
    EVENT_NAMES = [...TOUCH_EVENT_NAMES];
    break;
  case 'hybrid':
    EVENT_NAMES = [...MOUSE_EVENT_NAMES, ...TOUCH_EVENT_NAMES];
    break;
}

export class Rendering {
  private scoreRendering: ScoreRendering;
  private topic: Topic<RenderingEvents>;
  private cursor: cursors.PointCursor<any>;
  private installed: boolean;

  constructor(opts: {
    scoreRendering: ScoreRendering;
    topic: Topic<RenderingEvents>;
    cursor: cursors.PointCursor<any>;
  }) {
    this.scoreRendering = opts.scoreRendering;
    this.topic = opts.topic;
    this.cursor = opts.cursor;
    this.installed = false;
  }

  addEventListener<N extends keyof RenderingEvents>(name: N, callback: Callback<RenderingEvents[N]>): number {
    if (!this.installed) {
      this.install();
    }
    return this.topic.subscribe(name, callback);
  }

  removeEventListener(id: number): void {
    this.topic.unsubscribe(id);
    if (this.topic.getSubscriberCount() === 0 && this.installed) {
      this.uninstall();
    }
  }

  private install() {
    util.assert(!this.installed, 'Rendering has already installed native events');

    for (const eventName of EVENT_NAMES) {
      switch (eventName) {
        case 'mousedown':
          this.scoreRendering.container.addEventListener('mousedown', this.onNativeMouseDown);
          break;
        case 'mousemove':
          this.scoreRendering.container.addEventListener('mousemove', this.onNativeMouseMove);
          break;
        case 'mouseup':
          this.scoreRendering.container.addEventListener('mouseup', this.onNativeMouseUp);
          break;
        case 'touchstart':
          this.scoreRendering.container.addEventListener('touchstart', this.onNativeTouchStart, { passive: true });
          break;
        case 'touchmove':
          this.scoreRendering.container.addEventListener('touchmove', this.onNativeTouchMove, { passive: true });
          break;
        case 'touchend':
          this.scoreRendering.container.addEventListener('touchend', this.onNativeTouchEnd, { passive: true });
          break;
      }
    }

    this.installed = true;
  }

  private uninstall() {
    util.assert(this.installed, 'Rendering does not have native events installed');

    for (const eventName of EVENT_NAMES) {
      switch (eventName) {
        case 'mousedown':
          this.scoreRendering.container.removeEventListener('mousedown', this.onNativeMouseDown);
          break;
        case 'mousemove':
          this.scoreRendering.container.removeEventListener('mousemove', this.onNativeMouseMove);
          break;
        case 'mouseup':
          this.scoreRendering.container.removeEventListener('mouseup', this.onNativeMouseDown);
          break;
        case 'touchstart':
          this.scoreRendering.container.removeEventListener('touchstart', this.onNativeTouchStart);
          break;
        case 'touchmove':
          this.scoreRendering.container.removeEventListener('touchmove', this.onNativeTouchMove);
          break;
        case 'touchend':
          this.scoreRendering.container.removeEventListener('touchend', this.onNativeTouchEnd);
          break;
      }
    }

    this.installed = false;
  }

  private getPoint(clientX: number, clientY: number): spatial.Point {
    const container = this.scoreRendering.container;

    let host: Element = container;
    if (container instanceof HTMLDivElement) {
      host = container.firstElementChild!;
    }

    const rect = host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return new spatial.Point(x, y);
  }

  private onNativeMouseDown = (e: Event) => {
    this.topic.publish('click', {
      targets: this.cursor.getTargets(),
      point: this.cursor.getPoint(),
      src: e,
    });
  };

  private onNativeMouseMove = util.throttle((e: Event) => {
    util.assert(e instanceof MouseEvent, 'e must be a MouseEvent');
    const point = this.getPoint(e.clientX, e.clientY);
    this.cursor.update(point);
  }, MOVE_THROTTLE_MS);

  private onNativeMouseUp = (e: Event) => {};

  private onNativeTouchStart = (e: Event) => {};

  private onNativeTouchMove = util.throttle((e: Event) => {
    util.assert(e instanceof TouchEvent, 'e must be a TouchEvent');

    if (e.touches.length > 1) {
      return;
    }

    const touch = e.touches.item(0);
    if (!touch) {
      return;
    }

    const point = new spatial.Point(touch.clientX, touch.clientY);

    this.cursor.update(point);
  }, MOVE_THROTTLE_MS);

  private onNativeTouchEnd = (e: Event) => {};
}
