import { CursorFrame } from './cursorframe';
import { Scroller } from './scroller';
import { Timeline } from './timeline';
import { CursorVerticalSpan } from './types';
import * as elements from '@/elements';
import { Logger } from '@/debug';

export class Cursor {
  private constructor(
    private frames: CursorFrame[],
    private scroller: Scroller,
    private timeline: Timeline,
    private span: CursorVerticalSpan
  ) {}

  static create(
    logger: Logger,
    scrollContainer: HTMLElement,
    score: elements.Score,
    timeline: Timeline,
    span: CursorVerticalSpan
  ): Cursor {
    const frames = CursorFrame.create(logger, score, timeline, span);
    const scroller = new Scroller(scrollContainer);
    return new Cursor(frames, scroller, timeline, span);
  }
}
