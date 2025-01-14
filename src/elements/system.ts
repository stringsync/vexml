import * as rendering from '@/rendering';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Measure } from './measure';

export class System {
  private constructor(
    private config: Config,
    private log: Logger,
    private document: rendering.Document,
    private systemRender: rendering.SystemRender,
    private measures: Measure[]
  ) {}

  static create(
    config: Config,
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
  rect() {
    return this.systemRender.rect;
  }

  /** Returns the system index that this system resides in. */
  getIndex(): number {
    return this.systemRender.key.systemIndex;
  }

  /** Returns the measures of the system. */
  getMeasures(): Measure[] {
    return this.measures;
  }

  /** Returns the max number of parts in this score. */
  getPartCount(): number {
    return Math.max(0, ...this.measures.map((measure) => measure.getPartCount()));
  }
}
