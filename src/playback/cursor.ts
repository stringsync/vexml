import * as events from '@/events';
import * as util from '@/util';
import { Rect, Point } from '@/spatial';
import { CursorFrame } from './cursorframe';
import { Scroller } from './scroller';
import { CursorFrameLocator, CursorStateHintProvider } from './types';
import { FastCursorFrameLocator } from './fastcursorframelocator';
import { BSearchCursorFrameLocator } from './bsearchcursorframelocator';
import { Duration } from './duration';
import { CursorPath } from './cursorpath';
import { LazyCursorStateHintProvider } from './lazycursorstatehintprovider';

// NOTE: At 2px and below, there is some antialiasing issues on higher resolutions. The cursor will appear to "pulse" as
// it moves. This will happen even when rounding the position.
const CURSOR_WIDTH_PX = 3;

export type CursorState = {
  index: number;
  hasNext: boolean;
  hasPrevious: boolean;
  rect: Rect;
  frame: CursorFrame;
  hints: CursorStateHintProvider;
};

export type CursorEventMap = {
  change: CursorState;
};

export class Cursor {
  private topic = new events.Topic<CursorEventMap>();

  private currentIndex = 0;
  private currentAlpha = 0; // interpolation factor, ranging from 0 to 1

  private previousIndex = -1;
  private previousAlpha = -1;

  private constructor(private path: CursorPath, private locator: CursorFrameLocator, private scroller: Scroller) {}

  static create(path: CursorPath, scrollContainer: HTMLElement): Cursor {
    const bSearchLocator = new BSearchCursorFrameLocator(path);
    const fastLocator = new FastCursorFrameLocator(path, bSearchLocator);
    const scroller = new Scroller(scrollContainer);
    return new Cursor(path, fastLocator, scroller);
  }

  getCurrentState(): CursorState {
    return this.getState(this.currentIndex, this.currentAlpha);
  }

  getPreviousState(): CursorState | null {
    if (this.previousIndex === -1 || this.previousAlpha === -1) {
      return null;
    }
    return this.getState(this.previousIndex, this.previousAlpha);
  }

  next(): void {
    if (this.currentIndex === this.path.getFrames().length - 1) {
      this.update(this.currentIndex, { alpha: 1 });
    } else {
      this.update(this.currentIndex + 1, { alpha: 0 });
    }
  }

  previous(): void {
    this.update(this.currentIndex - 1, { alpha: 0 });
  }

  goTo(index: number): void {
    this.update(index, { alpha: 0 });
  }

  /** Snaps to the closest sequence entry step. */
  snap(timeMs: number): void {
    const time = this.normalize(timeMs);
    const index = this.locator.locate(time);
    util.assertNotNull(index, 'Cursor frame locator failed to find a frame.');
    this.update(index, { alpha: 0 });
  }

  /** Seeks to the exact position, interpolating as needed. */
  seek(timestampMs: number): void {
    const time = this.normalize(timestampMs);
    const index = this.locator.locate(time);
    util.assertNotNull(index, 'Cursor frame locator failed to find a frame.');
    const entry = this.path.getFrames().at(index);
    util.assertDefined(entry);

    const left = entry.tRange.start;
    const right = entry.tRange.end;
    const alpha = (time.ms - left.ms) / (right.ms - left.ms);

    this.update(index, { alpha });
  }

  isFullyVisible(): boolean {
    const cursorRect = this.getCurrentState().rect;
    return this.scroller.isFullyVisible(cursorRect);
  }

  scrollIntoView(behavior: ScrollBehavior = 'auto'): void {
    const scrollPoint = this.getScrollPoint();
    this.scroller.scrollTo(scrollPoint, behavior);
  }

  addEventListener<N extends keyof CursorEventMap>(
    name: N,
    listener: events.EventListener<CursorEventMap[N]>,
    opts?: { emitBootstrapEvent?: boolean }
  ): number {
    const id = this.topic.subscribe(name, listener);
    if (opts?.emitBootstrapEvent) {
      listener(this.getCurrentState());
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

  private getState(index: number, alpha: number): CursorState {
    const frame = this.path.getFrames().at(index);
    util.assertDefined(frame);

    const rect = this.getCursorRect(frame, alpha);
    const hasNext = index < this.path.getFrames().length - 1;
    const hasPrevious = index > 0;

    const hints = new LazyCursorStateHintProvider(frame, this.getPreviousState()?.frame);

    return {
      index,
      hasNext,
      hasPrevious,
      rect,
      frame,
      hints,
    };
  }

  private getScrollPoint(): Point {
    const cursorRect = this.getCurrentState().rect;
    const x = cursorRect.center().x;
    const y = cursorRect.y;
    return new Point(x, y);
  }

  private normalize(timeMs: number): Duration {
    const ms = util.clamp(0, this.getDuration().ms, timeMs);
    return Duration.ms(ms);
  }

  private getDuration(): Duration {
    return this.path.getFrames().at(-1)?.tRange.end ?? Duration.zero();
  }

  private getCursorRect(frame: CursorFrame, alpha: number): Rect {
    const x = frame.xRange.lerp(alpha);
    const y = frame.yRange.start;
    const w = CURSOR_WIDTH_PX;
    const h = frame.yRange.getSize();
    return new Rect(x, y, w, h);
  }

  private update(index: number, { alpha }: { alpha: number }): void {
    index = util.clamp(0, this.path.getFrames().length - 1, index);
    alpha = util.clamp(0, 1, alpha);
    // Round to 3 decimal places to avoid overloading the event system with redundant updates.
    alpha = Math.round(alpha * 1000) / 1000;
    if (index !== this.currentIndex || alpha !== this.currentAlpha) {
      this.previousIndex = this.currentIndex;
      this.previousAlpha = this.currentAlpha;
      this.currentIndex = index;
      this.currentAlpha = alpha;
      this.topic.publish('change', this.getCurrentState());
    }
  }
}
