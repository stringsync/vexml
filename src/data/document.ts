import * as util from '@/util';
import { Score } from './types';

/** Document is an interface for mutating a {@link Score}. */
export class Document {
  constructor(public readonly score: Score) {}

  /** Returns a valid empty Document. */
  static empty() {
    return new Document({
      type: 'score',
      title: null,
      systems: [],
      partLabels: [],
      curves: [],
      wedges: [],
      pedals: [],
      octaveShifts: [],
      vibratos: [],
    });
  }

  /** Inserts a gap at specified measure and fragment indexes. */
  insertGap(): void {
    throw new Error('Method not implemented.');
  }

  clone(): Document {
    const score = util.deepClone(this.score);
    return new Document(score);
  }
}
