import * as elements from '@/elements';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';
import { SystemKey } from './types';

export class System {
  constructor(private config: Config, private log: Logger, private document: Document, private key: SystemKey) {}

  getMeasures(): Measure[] {
    return this.document
      .getMeasures(this.key)
      .map((_, measureIndex) => new Measure(this.config, this.log, this.document, { ...this.key, measureIndex }));
  }

  render(ctx: vexflow.RenderContext): elements.System {
    const measures = this.getMeasures().map((measure) => measure.render(ctx));

    return new elements.System(ctx, measures);
  }
}
