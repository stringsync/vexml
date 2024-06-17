import * as events from '@/events';
import { EventMap } from './events';
import { Config } from './config';

/** The result of rendering MusicXML. */
export class Rendering {
  private config: Config;
  private bridge: events.NativeBridge<keyof EventMap>;
  private topic: events.Topic<EventMap>;

  private tally: { [K in keyof EventMap]?: number } = {};

  constructor(opts: { config: Config; bridge: events.NativeBridge<keyof EventMap>; topic: events.Topic<EventMap> }) {
    this.config = opts.config;
    this.bridge = opts.bridge;
    this.topic = opts.topic;
  }

  /** Adds a vexml event listener. */
  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    const handle = this.topic.subscribe(name, listener);
    if (this.increment(name) === 1) {
      this.bridge.activate(name);
    }
    return handle;
  }

  /** Removes a vexml event listener. */
  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      const subscription = this.topic.unsubscribe(id);
      if (!subscription) {
        return;
      }

      if (this.decrement(subscription.name) === 0) {
        this.bridge.deactivate(subscription.name);
      }
    }
  }

  /** Removes all vexml event listeners. */
  removeAllEventListeners(): void {
    this.topic.unsubscribeAll();
    this.bridge.deactivateAll();
    this.tally = {};
  }

  private increment<N extends keyof EventMap>(name: N): number {
    this.tally[name] ??= 0;
    return ++this.tally[name]!;
  }

  private decrement<N extends keyof EventMap>(name: N): number {
    this.tally[name] ??= 1;
    return --this.tally[name]!;
  }
}
