import * as events from '@/events';
import * as components from '@/components';
import { EventListener } from '@/events';
import { EventMap } from './types';
import { EventMappingFactory } from './eventmappingfactory';
import { Locator } from './locator';
import { TimestampLocator } from '../playback';
import { Config } from '@/config';

export class Events {
  private constructor(
    private config: Config,
    private root: components.Root,
    private vexmlEventTopic: events.Topic<EventMap>,
    private nativeEventTopic: events.Topic<HTMLElementEventMap>,
    private bridge: events.NativeBridge<keyof EventMap>
  ) {}

  static create(
    config: Config,
    root: components.Root,
    elementLocator: Locator,
    timestampLocator: TimestampLocator
  ): Events {
    const vexmlEventTopic = new events.Topic<EventMap>();
    const nativeEventTopic = new events.Topic<HTMLElementEventMap>();
    const mappings = EventMappingFactory.create(
      root,
      elementLocator,
      timestampLocator,
      vexmlEventTopic,
      config.INPUT_TYPE
    );
    const bridge = new events.NativeBridge<keyof EventMap>(root, mappings, nativeEventTopic, {
      touchstart: { passive: true },
      touchmove: { passive: true },
      touchcancel: { passive: true },
      touchend: { passive: true },
    });
    return new Events(config, root, vexmlEventTopic, nativeEventTopic, bridge);
  }

  addEventListener<N extends keyof EventMap>(type: N, listener: EventListener<EventMap[N]>): number {
    if (!this.vexmlEventTopic.hasSubscribers(type) && !this.bridge.isActivated(type)) {
      this.bridge.activate(type);
    }
    return this.vexmlEventTopic.subscribe(type, listener);
  }

  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      const subscription = this.vexmlEventTopic.unsubscribe(id);
      if (!subscription) {
        return;
      }

      if (!this.vexmlEventTopic.hasSubscribers(subscription.name) && this.bridge.isActivated(subscription.name)) {
        this.bridge.deactivate(subscription.name);
      }
    }
  }

  removeAllEventListeners(): void {
    this.bridge.deactivateAll();
    this.vexmlEventTopic.unsubscribeAll();
    this.nativeEventTopic.unsubscribeAll();
  }

  dispatchNativeEvent(event: Event): void {
    this.root.getOverlay().getElement().dispatchEvent(event);
  }
}
