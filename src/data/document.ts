import { Gap, Score } from './types';

/** Document is an interface for querying and mutating a {@link Score}. */
export class Document {
  constructor(private score: Score) {}

  /** Returns a valid empty Document. */
  static empty() {
    return new Document({ measures: [] });
  }

  /** Returns the {@link Score}. */
  getScore() {
    return this.score;
  }

  /** Inserts a gap at specified measure and fragment indexes. */
  insertGap(gap: Gap, opts: { measureIndex: number; fragmentIndex?: number }): void {
    const { measureIndex, fragmentIndex = 0 } = opts;

    const measure = this.score.measures[measureIndex];
    if (!measure) {
      throw new Error(`Measure at index ${measureIndex} not found`);
    }

    measure.entries.splice(fragmentIndex, 0, gap);
  }
}
