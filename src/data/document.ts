import * as util from '@/util';
import * as errors from '@/errors';
import { NonMusicalFragment as NonMusicalFragment, Score } from './types';

const DEFAULT_FRAGMENT_WIDTH = 300;

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

  /**
   * Mutates the score by inserting a gap measure with the given message. It will cause the measure indexes to shift,
   * but not the measure labels.
   */
  insertGapMeasureBefore(opts: {
    absoluteMeasureIndex: number;
    durationMs: number;
    minWidth?: number;
    label?: string;
  }): this {
    // Inserting gaps requires us to know about the part and stave signatures, so we can visually extend the measure
    // that precedes it.

    const measures = this.score.systems.flatMap((system) => system.measures);
    if (measures.length === 0) {
      throw new errors.DocumentError('cannot insert gap into empty score');
    }

    if (opts.absoluteMeasureIndex > measures.length) {
      throw new errors.DocumentError('cannot insert gap after non-existent measure');
    }

    // First, find a template that we'll copy to create the gap.
    const templateMeasure = measures[opts.absoluteMeasureIndex];

    // Clone the template. We'll mutate the clone and insert it into the score.
    const cloneMeasure = util.deepClone(templateMeasure);

    if (cloneMeasure.fragments.length === 0) {
      throw new errors.DocumentError('cannot insert gap into empty measure');
    }

    // Update the measure properties we don't care about.
    cloneMeasure.label = null;
    cloneMeasure.fragments.splice(0, cloneMeasure.fragments.length - 1);

    // Transform the fragment into a non-musical gap.
    cloneMeasure.fragments[0].kind = 'nonmusical';

    const gapFragment = cloneMeasure.fragments[0] as NonMusicalFragment;
    gapFragment.durationMs = opts.durationMs;
    gapFragment.label = opts.label ?? null;
    gapFragment.minWidth = opts.minWidth ?? DEFAULT_FRAGMENT_WIDTH;

    // Get rid of all the voices in the parts, since we're potentially just rendering a label.
    gapFragment.parts
      .flatMap((part) => part.staves)
      .forEach((stave) => {
        stave.voices = [];
      });

    // Insert the gap into the score into the same system as the template.
    const systemIndex = this.score.systems.findIndex((system) => system.measures.includes(templateMeasure));
    this.score.systems[systemIndex].measures.splice(opts.absoluteMeasureIndex, 0, cloneMeasure);

    return this;
  }

  clone(): Document {
    const score = util.deepClone(this.score);
    return new Document(score);
  }
}
