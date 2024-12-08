import * as rendering from '@/rendering';
import * as playback from '@/playback';
import * as util from '@/util';
import { CheapLocator } from './cheaplocator';
import { ExpensiveLocator } from './expensivelocator';

type CursorState = {
  index: number;
  interactables: rendering.InteractableRendering[];
  hasNext: boolean;
  hasPrevious: boolean;
};

export class Cursor {
  private sequence: playback.Sequence;
  private cheapLocator: CheapLocator;
  private expensiveLocator: ExpensiveLocator;
  private index = 0;

  constructor(sequence: playback.Sequence, cheapLocator: CheapLocator, expensiveLocator: ExpensiveLocator) {
    this.sequence = sequence;
    this.cheapLocator = cheapLocator;
    this.expensiveLocator = expensiveLocator;
  }

  getState(): CursorState {
    const index = this.index;
    const interactables = this.sequence.getEntry(this.index)?.interactables ?? [];
    const hasPrevious = this.index > 0;
    const hasNext = this.index < this.sequence.getLength() - 1;
    return { index, interactables, hasPrevious, hasNext };
  }

  getDurationMs(): number {
    // TODO: Fix this.
    return 0;
  }

  next(): void {
    this.goTo(this.index + 1);
  }

  previous(): void {
    this.goTo(this.index - 1);
  }

  goTo(index: number): void {
    this.index = util.clamp(index, 0, this.sequence.getLength() - 1);
  }

  seek(timeMs: number): void {
    const index = this.cheapLocator.setIndex(this.index).locate(timeMs) ?? this.expensiveLocator.locate(timeMs);
    if (typeof index !== 'number') {
      throw new Error(`locator coverage is insufficient to locate time ${timeMs}`);
    }
    this.goTo(index);
  }
}
