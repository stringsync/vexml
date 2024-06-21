import * as events from '@/events';
import { EventMap } from './events';
import { Config } from '@/config';

/** The result of rendering MusicXML. */
export class Rendering {
  private config: Config;
  private bridge: events.NativeBridge<keyof EventMap>;
  private topic: events.Topic<EventMap>;
  private container: HTMLDivElement | HTMLCanvasElement;
  private isDestroyed = false;

  constructor(opts: {
    config: Config;
    bridge: events.NativeBridge<keyof EventMap>;
    topic: events.Topic<EventMap>;
    container: HTMLDivElement | HTMLCanvasElement;
  }) {
    this.config = opts.config;
    this.bridge = opts.bridge;
    this.topic = opts.topic;
    this.container = opts.container;
  }

  /** Adds a vexml event listener. */
  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    if (!this.topic.hasSubscribers(name) && !this.bridge.isActivated(name)) {
      this.bridge.activate(name);
    }
    return this.topic.subscribe(name, listener);
  }

  /** Removes a vexml event listener. */
  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      const subscription = this.topic.unsubscribe(id);
      if (!subscription) {
        return;
      }

      if (!this.topic.hasSubscribers(subscription.name) && this.bridge.isActivated(subscription.name)) {
        this.bridge.deactivate(subscription.name);
      }
    }
  }

  /** Removes all vexml event listeners. */
  removeAllEventListeners(): void {
    this.topic.unsubscribeAll();
    this.bridge.deactivateAll();
  }

  /** Destroys the rendering for further use. */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.removeAllEventListeners();
    this.bridge.deactivateAll();

    if (this.container instanceof HTMLCanvasElement) {
      const ctx = this.container.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.container.width, this.container.height);
      }
    } else {
      this.container.firstElementChild?.remove();
    }

    this.isDestroyed = true;
  }
}
