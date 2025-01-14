import * as playback from '@/playback';
import * as util from '@/util';
import * as spatial from '@/spatial';
import * as events from '@/events';
import * as elements from '@/elements';
import { Rect } from '@/spatial';
import { CheapLocator } from './cheaplocator';
import { ExpensiveLocator } from './expensivelocator';
import { Scroller } from './scroller';

const CURSOR_WIDTH_PX = 1.5;

type CursorState = {
  index: number;
  hasNext: boolean;
  hasPrevious: boolean;
  cursorRect: Rect;
  sequenceEntry: playback.SequenceEntry;
};

type EventMap = {
  change: CursorState;
};

export class Cursor {
  private scroller: Scroller;
  private states: CursorState[];
  private sequence: playback.Sequence;
  private cheapLocator: CheapLocator;
  private expensiveLocator: ExpensiveLocator;

  private topic = new events.Topic<EventMap>();
  private index = 0;
  private alpha = 0; // interpolation factor, ranging from 0 to 1

  private constructor(opts: {
    scroller: Scroller;
    states: CursorState[];
    sequence: playback.Sequence;
    cheapLocator: CheapLocator;
    expensiveLocator: ExpensiveLocator;
  }) {
    this.scroller = opts.scroller;
    this.states = opts.states;
    this.sequence = opts.sequence;
    this.cheapLocator = opts.cheapLocator;
    this.expensiveLocator = opts.expensiveLocator;
  }

  static create(
    scrollContainer: HTMLElement,
    score: elements.Score,
    partIndex: number,
    sequence: playback.Sequence
  ): Cursor {
    // NumberRange objects indexed by system index for the part.
    const systemPartYRanges = new Array<util.NumberRange>();

    for (const system of score.getSystems()) {
      const rect = Rect.merge(
        system
          .getMeasures()
          .flatMap((measure) => measure.getFragments())
          .flatMap((fragment) => fragment.getParts())
          .filter((part) => part.getIndex() === partIndex)
          .map((part) => part.rect())
      );
      const yRange = new util.NumberRange(rect.getMinY(), rect.getMaxY());
      systemPartYRanges.push(yRange);
    }

    const states = new Array<CursorState>(sequence.getCount());

    for (let index = 0; index < sequence.getCount(); index++) {
      const sequenceEntry = sequence.getEntry(index);
      util.assertNotNull(sequenceEntry);

      const hasPrevious = index > 0;
      const hasNext = index < sequence.getCount() - 1;

      const element = sequenceEntry.mostRecentElement;

      util.assertDefined(element);

      const systemIndex = element.getSystemIndex();
      const yRange = systemPartYRanges.at(systemIndex);

      util.assertDefined(yRange);

      const x = element.rect().center().x;
      const y = yRange.getStart();
      const w = CURSOR_WIDTH_PX;
      const h = yRange.getSize();

      const cursorRect = new spatial.Rect(x, y, w, h);

      states[index] = {
        index,
        hasPrevious,
        hasNext,
        cursorRect,
        sequenceEntry,
      };
    }

    const scroller = new Scroller(scrollContainer);
    const cheapLocator = new CheapLocator(sequence);
    const expensiveLocator = new ExpensiveLocator(sequence);

    return new Cursor({
      scroller,
      states,
      sequence,
      cheapLocator,
      expensiveLocator,
    });
  }

  getState(): CursorState {
    const state = this.states.at(this.index);
    util.assertDefined(state);

    if (this.alpha === 0) {
      return { ...state };
    }

    const x = util.lerp(state.sequenceEntry.xRange.getStart(), state.sequenceEntry.xRange.getEnd(), this.alpha);
    const y = state.cursorRect.y;
    const w = state.cursorRect.w;
    const h = state.cursorRect.h;
    const cursorRect = new spatial.Rect(x, y, w, h);

    return { ...state, cursorRect };
  }

  next(): void {
    if (this.index === this.sequence.getCount() - 1) {
      this.update(this.index, 1);
    } else {
      this.update(this.index + 1, 0);
    }
  }

  previous(): void {
    this.update(this.index - 1, 0);
  }

  goTo(index: number): void {
    this.update(index, 0);
  }

  /** Snaps to the closest sequence entry step. */
  snap(timestampMs: number): void {
    timestampMs = util.clamp(0, this.sequence.getDuration().ms, timestampMs);
    const time = playback.Duration.ms(timestampMs);
    const index = this.getIndexClosestTo(time);
    this.update(index, 0);
  }

  /** Seeks to the exact position, interpolating as needed. */
  seek(timestampMs: number): void {
    timestampMs = util.clamp(0, this.sequence.getDuration().ms, timestampMs);
    const time = playback.Duration.ms(timestampMs);
    const index = this.getIndexClosestTo(time);

    const entry = this.sequence.getEntry(index);
    util.assertNotNull(entry);

    const left = entry.durationRange.getStart();
    const right = entry.durationRange.getEnd();
    const alpha = (time.ms - left.ms) / (right.ms - left.ms);

    this.update(index, alpha);
  }

  isFullyVisible(): boolean {
    const cursorRect = this.getState().cursorRect;
    return this.scroller.isFullyVisible(cursorRect);
  }

  scrollIntoView(behavior: ScrollBehavior = 'auto'): void {
    const scrollPoint = this.getScrollPoint();
    this.scroller.scrollTo(scrollPoint, behavior);
  }

  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    return this.topic.subscribe(name, listener);
  }

  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      this.topic.unsubscribe(id);
    }
  }

  removeAllEventListeners(): void {
    this.topic.unsubscribeAll();
  }

  private getScrollPoint(): spatial.Point {
    const cursorRect = this.getState().cursorRect;
    const x = cursorRect.center().x;
    const y = cursorRect.y;
    return new spatial.Point(x, y);
  }

  private update(index: number, alpha: number): void {
    index = util.clamp(0, this.sequence.getCount() - 1, index);
    alpha = util.clamp(0, 1, alpha);
    if (index !== this.index || alpha !== this.alpha) {
      this.index = index;
      this.alpha = alpha;
      this.topic.publish('change', this.getState());
    }
  }

  private getIndexClosestTo(time: playback.Duration): number {
    const index = this.cheapLocator.setStartingIndex(this.index).locate(time) ?? this.expensiveLocator.locate(time);
    if (typeof index !== 'number') {
      throw new Error(`locator coverage is insufficient to locate time ${time.ms}`);
    }
    return index;
  }
}
