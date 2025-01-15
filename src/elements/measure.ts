import * as rendering from '@/rendering';
import * as data from '@/data';
import { Config } from '@/config';
import { Rect } from '@/spatial';
import { Logger } from '@/debug';
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
}
