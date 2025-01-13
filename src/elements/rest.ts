import * as rendering from '@/rendering';
import { Logger } from '@/debug';
import { Rect } from './types';

export class Rest {
  private constructor(
    private config: rendering.Config,
    private log: Logger,
    private document: rendering.Document,
    private restRender: rendering.RestRender
  ) {}

  static create(
    config: rendering.Config,
    log: Logger,
    document: rendering.Document,
    restRender: rendering.RestRender
  ): Rest {
    return new Rest(config, log, document, restRender);
  }

  /** The name of the element, which can be used as a type discriminant. */
  public readonly name = 'rest';

  /** Returns the bounding box of the element. */
  get rect(): Rect {
    return this.restRender.rect;
  }
}
