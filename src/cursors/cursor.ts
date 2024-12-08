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

  private constructor(sequence: playback.Sequence, cheapLocator: CheapLocator, expensiveLocator: ExpensiveLocator) {
    this.sequence = sequence;
    this.cheapLocator = cheapLocator;
    this.expensiveLocator = expensiveLocator;
  }

  static create(sequence: playback.Sequence): Cursor {
    const cheapLocator = new CheapLocator(sequence);
    const expensiveLocator = new ExpensiveLocator(sequence);
    return new Cursor(sequence, cheapLocator, expensiveLocator);
  }

  getState(): CursorState {
    const index = this.index;
    const interactables = this.sequence.getEntry(this.index)?.interactables ?? [];
    const hasPrevious = this.index > 0;
    const hasNext = this.index < this.sequence.getLength() - 1;
    return { index, interactables, hasPrevious, hasNext };
  }

  next(): this {
    this.goTo(this.index + 1);
    return this;
  }

  previous(): this {
    this.goTo(this.index - 1);
    return this;
  }

  goTo(index: number): this {
    this.index = util.clamp(0, this.sequence.getLength() - 1, index);
    return this;
  }

  seek(timeMs: number): this {
    timeMs = util.clamp(0, this.sequence.getDuration().ms, timeMs);
    const time = playback.Duration.ms(timeMs);
    const index = this.cheapLocator.setStartingIndex(this.index).locate(time) ?? this.expensiveLocator.locate(time);
    if (typeof index !== 'number') {
      throw new Error(`locator coverage is insufficient to locate time ${timeMs}`);
    }
    return this.goTo(index);
  }
}
