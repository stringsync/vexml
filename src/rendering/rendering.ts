import * as events from '@/events';
import * as components from '@/components';
import * as playback from '@/playback';
import { EventMap } from './events';
import { Config } from '@/config';

/** The result of rendering MusicXML. */
export class Rendering {
  private config: Config;
  private bridge: events.NativeBridge<keyof EventMap>;
  private topic: events.Topic<EventMap>;
  private root: components.Root;
  private sequences: playback.Sequence[];

  private isDestroyed = false;

  constructor(opts: {
    config: Config;
    bridge: events.NativeBridge<keyof EventMap>;
    topic: events.Topic<EventMap>;
    root: components.Root;
    sequences: playback.Sequence[];
  }) {
    this.config = opts.config;
    this.bridge = opts.bridge;
    this.topic = opts.topic;
    this.root = opts.root;
    this.sequences = opts.sequences;
  }

  /** Dispatches an event to the interactive surface element. */
  dispatchNativeEvent(event: Event): void {
    this.root.getOverlayElement().dispatchEvent(event);
  }

  /** Returns the element that vexflow is directly rendered on. */
  getVexflowElement(): SVGElement | HTMLCanvasElement {
    return this.root.getVexflowElement();
  }

  /** Returns the playback sequence for a given part. */
  getSequences(): playback.Sequence[] {
    return this.sequences;
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
    this.root.remove();

    this.isDestroyed = true;
  }
}
