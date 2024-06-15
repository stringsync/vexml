import * as util from '@/util';

type NativeEvent<T extends SVGElement | HTMLCanvasElement> = T extends SVGElement
  ? keyof SVGElementEventMap
  : T extends HTMLCanvasElement
  ? keyof HTMLElementEventMap
  : never;

export type NativeEventListener<
  T extends SVGElement | HTMLCanvasElement,
  S extends NativeEvent<T>
> = T extends SVGElement
  ? (this: SVGElement, event: SVGElementEventMap[S]) => void
  : (this: HTMLCanvasElement, event: HTMLElementEventMap[S]) => void;

export type EventMapping<T extends SVGElement | HTMLCanvasElement, V extends string> = {
  vexml: V;
  native: NativeEvent<T>[];
};

export type NativeEventListenerMap<T extends SVGElement | HTMLCanvasElement> = {
  [S in NativeEvent<T>]?: { callback: NativeEventListener<T, S>; opts?: AddEventListenerOptions };
};

/**
 * This class is responsible for lazily managing the activation and deactivation of native events on a host element.
 *
 * If a vexml user is not interested in a particular event, we should not add the corresponding native event listeners
 * if no other vexml events listen to it.
 */
export class LegacyNativeBridge<T extends SVGElement | HTMLCanvasElement, V extends string> {
  private host: T;
  private mappings: EventMapping<T, V>[];
  private listeners: NativeEventListenerMap<T>;

  /**
   * A tally of the number of vexml events that depend on each native event. When a tally reaches 0 for a given key,
   * the corresponding native event listener should be removed from the host element.
   */
  private tally: { [K in NativeEvent<T>]?: number } = {};

  // This is private to force the caller to use the factory methods to reduce the T union to one thing.
  private constructor(host: T, mappings: EventMapping<T, V>[], listeners: NativeEventListenerMap<T>) {
    this.host = host;
    this.mappings = mappings;
    this.listeners = listeners;
  }

  /** Creates a NativeBridge for an SVG element. */
  static forSVG<V extends string>(
    host: SVGElement,
    mappings: EventMapping<SVGElement, V>[],
    listeners: NativeEventListenerMap<SVGElement>
  ) {
    return new LegacyNativeBridge(host, mappings, listeners);
  }

  /** Creates a NativeBridge for a canvas element. */
  static forCanvas<V extends string>(
    host: HTMLCanvasElement,
    mappings: EventMapping<HTMLCanvasElement, V>[],
    listeners: NativeEventListenerMap<HTMLCanvasElement>
  ) {
    return new LegacyNativeBridge(host, mappings, listeners);
  }

  /** Activates a Vexml event, updating the native dependency tally as needed. */
  activate(vexmlEvent: V) {
    const mapping = this.mappings.find((m) => m.vexml === vexmlEvent);
    if (!mapping) {
      throw new Error(`no mapping found for event ${vexmlEvent}`);
    }

    for (const nativeEvent of mapping.native) {
      if (this.increment(nativeEvent) === 1) {
        this.addNativeEventListener(nativeEvent);
      }
    }
  }

  /** Deactivates a Vexml event, updating the native dependency tally as needed. */
  deactivate(vexmlEvent: V) {
    const mapping = this.mappings.find((m) => m.vexml === vexmlEvent);
    if (!mapping) {
      throw new Error(`no mapping found for event ${vexmlEvent}`);
    }

    for (const nativeEvent of mapping.native) {
      if (this.decrement(nativeEvent) === 0) {
        this.removeNativeEventListener(nativeEvent);
      }
    }
  }

  /** Deactivates all Vexml events. */
  deactivateAll() {
    for (const nativeEvent of Object.keys(this.tally)) {
      this.removeNativeEventListener(nativeEvent as NativeEvent<T>);
    }
    this.tally = {};
  }

  private increment(nativeEvent: NativeEvent<T>): number {
    this.tally[nativeEvent] ??= 0;
    return ++this.tally[nativeEvent]!;
  }

  private decrement(nativeEvent: NativeEvent<T>): number {
    let count = 0;
    if (nativeEvent in this.tally) {
      count = --this.tally[nativeEvent]!;
    }
    if (count === 0) {
      delete this.tally[nativeEvent];
    }
    return count;
  }

  private addNativeEventListener(nativeEvent: NativeEvent<T>) {
    util.assert(nativeEvent in this.listeners, `no listener found for event ${nativeEvent}`);
    const listener = this.listeners[nativeEvent]!;
    this.host.addEventListener(nativeEvent, listener.callback as any, listener.opts);
  }

  private removeNativeEventListener(nativeEvent: NativeEvent<T>) {
    util.assert(nativeEvent in this.listeners, `no listener found for event ${nativeEvent}`);
    const listener = this.listeners[nativeEvent]!;
    this.host.removeEventListener(nativeEvent, listener.callback as any, listener.opts);
  }
}
