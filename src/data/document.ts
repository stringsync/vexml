import { Gap, Score } from './types';
import * as errors from '@/errors';

/** Document is an interface for querying and mutating a {@link Score}. */
export class Document {
  constructor(public readonly score: Score) {}

  /** Returns a valid empty Document. */
  static empty() {
    return new Document({ type: 'score', title: '', systems: [], partLabels: [] });
  }

  /** Inserts a gap at specified measure and fragment indexes. */
  insertGap(gap: Gap, opts: { measureIndex: number; fragmentIndex?: number }): void {
    const { measureIndex, fragmentIndex = 0 } = opts;

    const measure = this.score.systems.flatMap((system) => system.measures).at(measureIndex);
    if (!measure) {
      throw new errors.VexmlError(`Measure at index ${measureIndex} not found`);
    }

    measure.entries.splice(fragmentIndex, 0, gap);
  }
}
