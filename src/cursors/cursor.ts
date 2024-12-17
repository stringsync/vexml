import * as rendering from '@/rendering';
import * as playback from '@/playback';
import * as util from '@/util';
import * as spatial from '@/spatial';
import * as events from '@/events';
import { CheapLocator } from './cheaplocator';
import { ExpensiveLocator } from './expensivelocator';
import { Scroller } from './scroller';

const CURSOR_WIDTH_PX = 1.5;

const PART_VERTICAL_SPAN_RENDERINGS = [
  'stave',
  'stavenote',
  'stavechord',
  'gracenote',
  'gracechord',
  'tabnote',
  'tabchord',
  'tabgracenote',
  'tabgracechord',
  'rest',
] as const;

const SYSTEM_VERTICAL_SPAN_RENDERINGS = ['measure'] as const;

type CursorState = {
  index: number;
  hasNext: boolean;
  hasPrevious: boolean;
  partRect: spatial.Rect;
  measureRect: spatial.Rect;
  systemRect: spatial.Rect;
  playableRect: spatial.Rect;
  cursorRect: spatial.Rect;
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

  static create(opts: {
    scrollContainer: HTMLElement;
    score: rendering.ScoreRendering;
    partId: string;
    sequence: playback.Sequence;
  }): Cursor {
    const { score, partId, sequence } = opts;
    const query = rendering.Query.of(score).where(rendering.filters.forPart(partId));

    const systemIndexes = query.select('system').map((system) => system.index);

    const partRects = systemIndexes.map((systemIndex) => {
      const rects = query
        .where(rendering.filters.forSystem(systemIndex))
        .select(...PART_VERTICAL_SPAN_RENDERINGS)
        .map(rendering.InteractionModel.create)
        .map((model) => model.getBoundingBox());
      return { systemIndex, rect: spatial.Rect.merge(rects) };
    });

    const systemRects = systemIndexes.map((systemIndex) => {
      const rects = query
        .where(rendering.filters.forSystem(systemIndex))
        .select(...SYSTEM_VERTICAL_SPAN_RENDERINGS)
        .map(rendering.InteractionModel.create)
        .map((model) => model.getBoundingBox());
      return { systemIndex, rect: spatial.Rect.merge(rects) };
    });

    const measureRects = query
      .select('measure')
      .map(rendering.InteractionModel.create)
      .map((model) => ({ measureIndex: model.value.index, rect: model.getBoundingBox() }));

    const states = new Array<CursorState>(sequence.getLength());
    for (let index = 0; index < sequence.getLength(); index++) {
      const sequenceEntry = sequence.getEntry(index);
      util.assertNotNull(sequenceEntry);

      const hasPrevious = index > 0;
      const hasNext = index < sequence.getLength() - 1;

      const interactable = sequenceEntry.mostRecentInteractable;

      util.assertDefined(interactable);

      const systemIndex = interactable.address.getSystemIndex();
      const measureIndex = interactable.address.getMeasureIndex();

      const partRect = partRects.find((rect) => rect.systemIndex === systemIndex)?.rect;
      util.assertDefined(partRect);

      const systemRect = systemRects.find((rect) => rect.systemIndex === systemIndex)?.rect;
      util.assertDefined(systemRect);

      const measureRect = measureRects.find((rect) => rect.measureIndex === measureIndex)?.rect;
      util.assertDefined(measureRect);

      const playableRect = rendering.InteractionModel.create(interactable).getBoundingBox();

      const x = playableRect.center().x;
      const y = partRect.y;
      const w = CURSOR_WIDTH_PX;
      const h = partRect.h;

      const cursorRect = new spatial.Rect(x, y, w, h);

      states[index] = {
        index,
        hasPrevious,
        hasNext,
        systemRect,
        measureRect,
        partRect,
        playableRect,
        cursorRect,
        sequenceEntry,
      };
    }

    const scroller = new Scroller(opts.scrollContainer);
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

    const x = util.lerp(state.sequenceEntry.xRange.getLeft(), state.sequenceEntry.xRange.getRight(), this.alpha);
    const y = state.cursorRect.y;
    const w = state.cursorRect.w;
    const h = state.cursorRect.h;
    const cursorRect = new spatial.Rect(x, y, w, h);

    return { ...state, cursorRect };
  }

  next(): void {
    this.update(this.index + 1, 0);
  }

  previous(): void {
    this.update(this.index - 1, 0);
  }

  goTo(index: number): void {
    this.update(index, 0);
  }

  /** Snaps to the closest sequence entry step. */
  snap(timeMs: number): void {
    timeMs = util.clamp(0, this.sequence.getDuration().ms, timeMs);
    const time = playback.Duration.ms(timeMs);
    const index = this.getIndexClosestTo(time);
    this.update(index, 0);
  }

  /** Seeks to the exact position, interpolating as needed. */
  seek(timeMs: number): void {
    timeMs = util.clamp(0, this.sequence.getDuration().ms, timeMs);
    const time = playback.Duration.ms(timeMs);
    const index = this.getIndexClosestTo(time);

    const entry = this.sequence.getEntry(index);
    util.assertNotNull(entry);

    const left = entry.durationRange.getLeft();
    const right = entry.durationRange.getRight();
    const alpha = (time.ms - left.ms) / (right.ms - left.ms);

    this.update(index, alpha);
  }

  isFullyVisible(): boolean {
    const cursorRect = this.getState().cursorRect;
    return this.scroller.isFullyVisible(cursorRect);
  }

  scrollIntoView(): void {
    const scrollPoint = this.getScrollPoint();
    this.scroller.scrollTo(scrollPoint);
  }

  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    return this.topic.subscribe(name, listener);
  }

  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      this.topic.unsubscribe(id);
    }
  }

  private getScrollPoint(): spatial.Point {
    const cursorRect = this.getState().cursorRect;
    const x = cursorRect.center().x;
    const y = cursorRect.y;
    return new spatial.Point(x, y);
  }

  private update(index: number, alpha: number): void {
    index = util.clamp(0, this.sequence.getLength() - 1, index);
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
