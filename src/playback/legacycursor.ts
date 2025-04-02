import * as playback from '@/playback';
import * as util from '@/util';
import * as spatial from '@/spatial';
import * as events from '@/events';
import * as elements from '@/elements';
import { Rect } from '@/spatial';
import { CheapLocator } from './cheaplocator';
import { ExpensiveLocator } from './expensivelocator';
import { Scroller } from './scroller';

// NOTE: At 2px and below, there is some antialiasing issues on higher resolutions. The cursor will appear to "pulse" as
// it moves. This will happen even when rounding the position.
const CURSOR_WIDTH_PX = 3;

type CursorState = {
  index: number;
  hasNext: boolean;
  hasPrevious: boolean;
  cursorRect: Rect;
  sequenceEntry: playback.LegacySequenceEntry;
};

type EventMap = {
  change: CursorState;
};

export type CursorVerticalSpan = {
  fromPartIndex: number;
  toPartIndex: number;
};

export class LegacyCursor {
  private scroller: Scroller;
  private states: CursorState[];
  private sequence: playback.LegacySequence;
  private cheapLocator: CheapLocator;
  private expensiveLocator: ExpensiveLocator;
  private span: CursorVerticalSpan;

  private topic = new events.Topic<EventMap>();
  private index = 0;
  private alpha = 0; // interpolation factor, ranging from 0 to 1

  private constructor(opts: {
    scroller: Scroller;
    states: CursorState[];
    sequence: playback.LegacySequence;
    cheapLocator: CheapLocator;
    expensiveLocator: ExpensiveLocator;
    span: CursorVerticalSpan;
  }) {
    this.scroller = opts.scroller;
    this.states = opts.states;
    this.sequence = opts.sequence;
    this.cheapLocator = opts.cheapLocator;
    this.expensiveLocator = opts.expensiveLocator;
    this.span = opts.span;
  }

  static create(
    scrollContainer: HTMLElement,
    score: elements.Score,
    sequence: playback.LegacySequence,
    span: CursorVerticalSpan
  ): LegacyCursor {
    // NumberRange objects indexed by system index for the part.
    const systemPartYRanges = new Array<util.NumberRange>();

    for (const system of score.getSystems()) {
      const rect = Rect.merge(
        system
          .getMeasures()
          .flatMap((measure) => measure.getFragments())
          .flatMap((fragment) => fragment.getParts())
          .filter((part) => span.fromPartIndex <= part.getIndex() && part.getIndex() <= span.toPartIndex)
          .map((part) => part.rect())
      );
      const yRange = new util.NumberRange(rect.top(), rect.bottom());
      systemPartYRanges.push(yRange);
    }

    const states = new Array<CursorState>(sequence.getCount());

    for (let index = 0; index < sequence.getCount(); index++) {
      const sequenceEntry = sequence.getEntry(index);
      util.assertNotNull(sequenceEntry);

      const hasPrevious = index > 0;
      const hasNext = index < sequence.getCount() - 1;

      const element = sequenceEntry.anchorElement;

      util.assertDefined(element);

      const xRange = sequenceEntry.xRange;

      const systemIndex = element.getSystemIndex();
      const yRange = systemPartYRanges.at(systemIndex);

      util.assertDefined(yRange);

      const x = xRange.start;
      const y = yRange.start;
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

    return new LegacyCursor({
      scroller,
      states,
      sequence,
      cheapLocator,
      expensiveLocator,
      span,
    });
  }

  getState(): CursorState {
    const state = this.states.at(this.index);
    // TODO: We need a way to represent a zero state, when the sequence validly has no entries. Maybe we update the
    // signature to be nullable.
    util.assertDefined(state);

    if (this.alpha === 0) {
      return { ...state };
    }

    const x = util.lerp(state.sequenceEntry.xRange.start, state.sequenceEntry.xRange.end, this.alpha);
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

    const left = entry.durationRange.start;
    const right = entry.durationRange.end;
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

  addEventListener<N extends keyof EventMap>(
    name: N,
    listener: events.EventListener<EventMap[N]>,
    opts?: { emitBootstrapEvent?: boolean }
  ): number {
    const id = this.topic.subscribe(name, listener);
    if (opts?.emitBootstrapEvent) {
      listener(this.getState());
    }
    return id;
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
    // Round to 3 decimal places to avoid overloading the event system with redundant updates.
    alpha = Math.round(alpha * 1000) / 1000;
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
