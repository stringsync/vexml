import * as events from '@/events';
import * as components from '@/components';
import * as cursors from '@/cursors';
import * as playback from '@/playback';
import * as util from '@/util';
import { EventMap } from './events';
import { Config } from '@/config';
import { ScoreRendering } from './score';

/** Describes how much the cursor should vertically span. */
export type CursorVerticalSpan = 'system' | 'part';

/** The result of rendering MusicXML. */
export class Rendering {
  private config: Config;
  private score: ScoreRendering;
  private bridge: events.NativeBridge<keyof EventMap>;
  private topic: events.Topic<EventMap>;
  private root: components.Root;
  private sequences: playback.Sequence[];
  private partIds: string[];

  private isDestroyed = false;

  constructor(opts: {
    config: Config;
    score: ScoreRendering;
    bridge: events.NativeBridge<keyof EventMap>;
    topic: events.Topic<EventMap>;
    root: components.Root;
    sequences: playback.Sequence[];
    partIds: string[];
  }) {
    this.config = opts.config;
    this.score = opts.score;
    this.bridge = opts.bridge;
    this.topic = opts.topic;
    this.root = opts.root;
    this.sequences = opts.sequences;
    this.partIds = opts.partIds;
  }

  /** Returns the part IDs for the score. */
  getPartIds() {
    return this.partIds;
  }

  /** Creates a new discrete cursor for the part ID */
  createDiscreteCursor(opts?: { span?: CursorVerticalSpan; partId?: string; color?: string }): cursors.DiscreteCursor {
    const span = opts?.span ?? 'system';
    const partId = opts?.partId ?? this.partIds[0];

    const sequence = this.sequences.find((sequence) => sequence.getPartId() === partId);

    util.assertDefined(sequence);

    const overlayElement = this.root.getOverlay().getElement();
    const cursorModel = new cursors.DiscreteCursor(this.score, sequence, span);
    const cursorComponent = components.Cursor.render(overlayElement, opts?.color);

    cursorModel.addEventListener('change', (event) => {
      const rect = event.rect;
      if (rect) {
        cursorComponent.update(rect);
      }
    });
    const rect = cursorModel.getCurrent()?.rect;
    if (rect) {
      cursorComponent.update(rect);
    }

    return cursorModel;
  }

  /** Dispatches an event to the interactive surface element. */
  dispatchNativeEvent(event: Event): void {
    this.root.getOverlay().getElement().dispatchEvent(event);
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
