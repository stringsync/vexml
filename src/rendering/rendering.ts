import * as events from '@/events';
import { Events } from './events';
import { Config } from './config';

/** The result of rendering MusicXML. */
export class Rendering {
  private config: Config;
  private bridge: events.LegacyNativeBridge<SVGElement | HTMLCanvasElement, keyof Events>;
  private topic: events.Topic<Events>;

  constructor(opts: {
    config: Config;
    bridge: events.LegacyNativeBridge<SVGElement | HTMLCanvasElement, keyof Events>;
    topic: events.Topic<Events>;
  }) {
    this.config = opts.config;
    this.bridge = opts.bridge;
    this.topic = opts.topic;
  }

  /** Adds a vexml event listener. */
  addEventListener<N extends keyof Events>(name: N, listener: events.Listener<Events[N]>): number {
    const handle = this.topic.subscribe(name, listener);
    this.bridge.activate(name);
    return handle;
  }

  /** Removes a vexml event listener. */
  removeEventListener(id: number): void {
    const subscription = this.topic.unsubscribe(id);
    if (subscription) {
      this.bridge.deactivate(subscription.name);
    }
  }

  /** Removes all vexml event listeners. */
  removeAllEventListeners(): void {
    this.topic.unsubscribeAll();
    this.bridge.deactivateAll();
  }
}
