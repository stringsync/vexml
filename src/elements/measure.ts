import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Fragment } from './fragment';
import { Rect } from './types';

export class Measure {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private measureRender: rendering.MeasureRender,
    private fragments: Fragment[]
  ) {}

  static create(
    config: rendering.Config,
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
  get rect(): Rect {
    return this.measureRender.rect;
  }

  /** Returns the fragments of the measure. */
  getFragments(): Fragment[] {
    return this.fragments;
  }
}
