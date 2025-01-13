import * as rendering from '@/rendering';
import { Logger } from '@/debug';

export class System {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private systemRender: rendering.SystemRender
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    systemRender: rendering.SystemRender
  ): System {
    return new System(config, log, document, systemRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'system';

  /** Returns the bounding box of the system. */
  get rect() {
    return this.systemRender.rect;
  }
}
