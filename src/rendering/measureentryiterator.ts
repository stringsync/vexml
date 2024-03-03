import * as musicxml from '@/musicxml';
import { Division } from './division';
import { MeasureEntry, StaveSignature } from './stavesignature';

/** An iteration value of the iterator. */
export type MeasureEntryIteration =
  | {
      done: true;
      value: null;
    }
  | {
      done: false;
      value: {
        entry: MeasureEntry;
        start: Division;
        end: Division;
      };
    };

/** Iterates over an array of measure entries, accounting for the active stave signature and divisions. */
export class MeasureEntryIterator {
  private entries: MeasureEntry[];
  private index: number;
  private staveSignature: StaveSignature;
  private iteration?: MeasureEntryIteration;

  constructor(opts: { entries: MeasureEntry[]; staveSignature: StaveSignature }) {
    this.entries = opts.entries;
    this.index = -1;
    this.staveSignature = opts.staveSignature;
  }

  /** Returns the current stave signature of the iterator. */
  getStaveSignature(): StaveSignature {
    return this.staveSignature;
  }

  /** Returns the current iteration of the iterator or throws if there isn't one. */
  peek(): MeasureEntryIteration {
    if (typeof this.iteration === 'undefined') {
      throw new Error('must initialize before peeking');
    }
    return this.iteration;
  }

  /** Moves the cursor to the next iteration or throws if there isn't one. */
  next(): MeasureEntryIteration {
    if (this.index >= this.entries.length) {
      return this.update({ done: true, value: null });
    }

    const entry = this.entries[this.index++];

    let duration = 0;

    if (entry instanceof StaveSignature) {
      this.staveSignature = entry;
    }

    if (entry instanceof musicxml.Note && !entry.isChordTail() && !entry.isGrace()) {
      duration = entry.getDuration();
    }

    if (entry instanceof musicxml.Backup) {
      duration = -entry.getDuration();
    }

    if (entry instanceof musicxml.Forward) {
      duration = entry.getDuration();
    }

    const quarterNoteDivisions = this.staveSignature.getQuarterNoteDivisions();
    const start = this.iteration?.value?.end ?? Division.zero();

    let end = start.add(Division.of(duration, quarterNoteDivisions));
    if (end.isLessThan(Division.zero())) {
      end = Division.zero();
    }

    return this.update({ done: false, value: { entry, start, end } });
  }

  /** Syntactic sugar for setting iteration and returning in the same expression. */
  private update(iteration: MeasureEntryIteration): MeasureEntryIteration {
    this.iteration = iteration;
    return iteration;
  }
}
