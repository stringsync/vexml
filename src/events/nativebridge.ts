import * as util from '@/util';
import { Topic } from './topic';
import { EventListener } from './types';

export type EventMapping<V extends string[]> = {
  vexml: V;
  native: {
    [K in keyof HTMLElementEventMap]?: EventListener<HTMLElementEventMap[K]>;
  };
};

/**
 * This class is responsible for lazily managing the activation and deactivation of native events on a host element.
 *
 * - Activation is the process initializing the native event machinery needed for a given vexml event.
 * - Deactivation is the process of cleaning up the native event machinery when a given vexml event is no longer needed.
 * - Native events are only added to the host element when they are needed.
 */
export class NativeBridge<V extends string> {
  private overlay: HTMLElement;
  private mappings: EventMapping<V[]>[];
  private nativeEventTopic: Topic<HTMLElementEventMap>;
  private nativeEventOpts: { [K in keyof HTMLElementEventMap]?: AddEventListenerOptions };

  // Handles for native event topic subscribers indexed by the vexml event name.
  private handles: { [K in V]?: number[] } = {};

  constructor(opts: {
    overlay: HTMLElement;
    mappings: EventMapping<V[]>[];
    nativeEventTopic: Topic<HTMLElementEventMap>;
    nativeEventOpts: { [K in keyof HTMLElementEventMap]?: AddEventListenerOptions };
  }) {
    this.overlay = opts.overlay;
    this.mappings = opts.mappings;
    this.nativeEventTopic = opts.nativeEventTopic;
    this.nativeEventOpts = opts.nativeEventOpts;
  }

  /** Returns whether the vexml event is activated. */
  isActivated(vexmlEventName: V) {
    return vexmlEventName in this.handles;
  }

  /**
   * Activates a vexml event, initializing the native event machinery if needed.
   *
   * NOTE: vexml events cannot be activated if they are already active. It is the caller's responsibility to ensure that
   * the event is not already active.
   */
  activate(vexmlEventName: V) {
    util.assert(!this.isActivated(vexmlEventName), `vexml event is already active: ${vexmlEventName}`);

    const mapping = this.mappings.find((m) => m.vexml.includes(vexmlEventName));
    if (!mapping) {
      return;
    }

    this.handles[vexmlEventName] ??= [];

    for (const native of Object.entries(mapping.native)) {
      const nativeEventName = native[0] as keyof HTMLElementEventMap;
      const nativeEventListener = native[1];

      // Enforce only a single listener per native event. vexml is intended to consume the event through the
      // nativeEventTopic. That way, we only run the native callbacks that we need to run.
      if (!this.nativeEventTopic.hasSubscribers(nativeEventName)) {
        this.overlay.addEventListener(nativeEventName, this.publishNativeEvent, this.nativeEventOpts[nativeEventName]);
      }
      const handle = this.nativeEventTopic.subscribe(nativeEventName, nativeEventListener);
      this.handles[vexmlEventName]!.push(handle);
    }
  }

  /**
   * Deactivates a vexml event, cleaning up the native event machinery if needed.
   *
   * NOTE: vexml events cannot be deactivated if they are already inactive. It is the caller's responsibility to ensure
   * that the event is not already inactive.
   */
  deactivate(vexmlEventName: V) {
    util.assert(this.isActivated(vexmlEventName), `vexml event is already inactive: ${vexmlEventName}`);

    const mapping = this.mappings.find((m) => m.vexml.includes(vexmlEventName));
    if (!mapping) {
      return;
    }

    for (const handle of this.handles[vexmlEventName]!) {
      this.nativeEventTopic.unsubscribe(handle);
    }
    delete this.handles[vexmlEventName];

    for (const native of Object.entries(mapping.native)) {
      const nativeEventName = native[0] as keyof HTMLElementEventMap;

      if (!this.nativeEventTopic.hasSubscribers(nativeEventName)) {
        this.overlay.removeEventListener(
          nativeEventName,
          this.publishNativeEvent,
          this.nativeEventOpts[nativeEventName]
        );
      }
    }
  }

  /** Deactivates all vexml events. */
  deactivateAll() {
    for (const vexmlEventName of Object.keys(this.handles)) {
      this.deactivate(vexmlEventName as V);
    }
  }

  /**
   * Forwards a native event to its respective topic.
   *
   * NOTE: This is done in this manner so we can have a reference to the function that is added as a native event
   * listener. This is necessary for unsubscribing from the native event listener when the dependent vexml events are
   * deactivated.
   */
  private publishNativeEvent = (event: Event) => {
    this.nativeEventTopic.publish(event.type as keyof HTMLElementEventMap, event);
    return false;
  };
}
