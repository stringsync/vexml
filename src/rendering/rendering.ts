import * as util from '@/util';
import { Topic, Callback } from '@/events';
import { ScoreRendering } from './score';

export type RenderingEvents = {
  click: { src: Event };
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
  private score: ScoreRendering;
  private topic = new Topic<RenderingEvents>();
  private installed = false;

  constructor(score: ScoreRendering) {
    this.score = score;
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
          this.score.container.addEventListener('mousedown', this.onNativeMouseDown);
          break;
        case 'mousemove':
          this.score.container.addEventListener('mousemove', this.onNativeMouseMove);
          break;
        case 'mouseup':
          this.score.container.addEventListener('mouseup', this.onNativeMouseUp);
          break;
        case 'touchstart':
          this.score.container.addEventListener('touchstart', this.onNativeTouchStart);
          break;
        case 'touchmove':
          this.score.container.addEventListener('touchmove', this.onNativeTouchMove);
          break;
        case 'touchend':
          this.score.container.addEventListener('touchend', this.onNativeTouchEnd);
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
          this.score.container.removeEventListener('mousedown', this.onNativeMouseDown);
          break;
        case 'mousemove':
          this.score.container.removeEventListener('mousemove', this.onNativeMouseMove);
          break;
        case 'mouseup':
          this.score.container.removeEventListener('mouseup', this.onNativeMouseDown);
          break;
        case 'touchstart':
          this.score.container.removeEventListener('touchstart', this.onNativeTouchStart);
          break;
        case 'touchmove':
          this.score.container.removeEventListener('touchmove', this.onNativeTouchMove);
          break;
        case 'touchend':
          this.score.container.removeEventListener('touchend', this.onNativeTouchEnd);
          break;
      }
    }

    this.installed = false;
  }

  private onNativeMouseDown = (e: Event) => {};

  private onNativeMouseMove = util.throttle((e: Event) => {}, MOVE_THROTTLE_MS);

  private onNativeMouseUp = (e: Event) => {};

  private onNativeTouchStart = (e: Event) => {};

  private onNativeTouchMove = util.throttle((e: Event) => {}, MOVE_THROTTLE_MS);

  private onNativeTouchEnd = (e: Event) => {};
}
