import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Measure } from './measure';

export class System {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private systemRender: rendering.SystemRender,
    private measures: Measure[]
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    systemRender: rendering.SystemRender
  ): System {
    const measures = systemRender.measureRenders.map((measureRender) =>
      Measure.create(config, log, document, measureRender)
    );
    return new System(config, log, document, systemRender, measures);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'system';

  /** Returns the bounding box of the element. */
  get rect() {
    return this.systemRender.rect;
  }

  /** Returns the measures of the system. */
  getMeasures(): Measure[] {
    return this.measures;
  }
}
