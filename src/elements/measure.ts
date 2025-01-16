import * as rendering from '@/rendering';
import * as data from '@/data';
import * as util from '@/util';
import { Config } from '@/config';
import { Rect } from '@/spatial';
import { Logger } from '@/debug';
import { Fraction } from '@/util';
import { Fragment } from './fragment';

export class Measure {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private measureRender: rendering.MeasureRender,
    private fragments: Fragment[]
  ) {}

  static create(
    config: Config,
    log: Logger,
    document: rendering.Document,
    measureRender: rendering.MeasureRender
  ): Measure {
    const fragments = measureRender.fragmentRenders.map((fragmentRender) =>
      Fragment.create(config, log, document, fragmentRender)
    );
    return new Measure(config, log, document, measureRender, fragments);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'measure';

  /** Returns the bounding box of the element. */
  rect(): Rect {
    return this.measureRender.rect;
  }

  /** Returns whether this measure is the last in the system. */
  isLastMeasureInSystem(): boolean {
    return this.document.isLastMeasure(this.measureRender.key);
  }

  /** Returns the system index of the measure. */
  getSystemIndex(): number {
    return this.measureRender.key.systemIndex;
  }

  /** Returns whether the measure is a multimeasure. */
  isMultiMeasure(): boolean {
    return this.measureRender.multiRestCount > 1;
  }

  /** Returns the fragments of the measure. */
  getFragments(): Fragment[] {
    return this.fragments;
  }

  /** Returns the max number of parts in this score. */
  getPartCount(): number {
    return Math.max(0, ...this.fragments.map((fragment) => fragment.getPartCount()));
  }

  /** Returns the jumps that occur in this measure. */
  getJumps(): data.Jump[] {
    return this.measureRender.jumps;
  }

  /** Returns the absolute measure index.  */
  getAbsoluteMeasureIndex(): number {
    return this.measureRender.absoluteIndex;
  }

  /**
   * Sometimes document measures are folded into one (e.g. multimeasure rest). This method returns the [start, end]
   * _absolute_ index range that the measure covers.
   */
  includesAbsoluteMeasureIndex(absoluteMeasureIndex: number): boolean {
    const start = this.measureRender.absoluteIndex;
    const multiMeasureCount = this.measureRender.multiRestCount;
    if (multiMeasureCount > 1) {
      return new util.NumberRange(start, start + multiMeasureCount - 1).includes(absoluteMeasureIndex);
    } else {
      return new util.NumberRange(start, start).includes(absoluteMeasureIndex);
    }
  }

  /** Always returns zero. This is used for sequencing with other playback elements. */
  getStartMeasureBeat(): Fraction {
    return Fraction.zero();
  }

  /** Returns how many beats are in this measure. */
  getBeatCount(): Fraction {
    const time = this.document
      .getMeasure(this.measureRender.key)
      .fragments.flatMap((fragment) => fragment.parts)
      .flatMap((part) => part.staves)
      .map((stave) => stave.signature.time)
      .at(0);

    if (!time) {
      this.log.warn('could not find time signature for measure', this.measureRender.key);
      return Fraction.zero();
    }

    const components = time.components.map(Fraction.fromFractionLike);

    const beatsPerMeasure = Fraction.sum(...components).multiply(new Fraction(4));
    const measureCount = Math.max(1, this.measureRender.multiRestCount);
    return beatsPerMeasure.multiply(new Fraction(measureCount));
  }

  /** Returns the BPM of the measure. */
  getBpm(): number {
    const bpm = this.fragments.at(0)?.getBpm();
    util.assertDefined(bpm);
    return bpm;
  }
}
