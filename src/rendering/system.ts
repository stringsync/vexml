import * as data from '@/data';
import * as elements from '@/elements';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';

export class System {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private data: { system: data.System }
  ) {}

  getMeasures(): Measure[] {
    return this.document.getMeasures().map((measure) => new Measure(this.config, this.log, this.document, { measure }));
  }

  render(ctx: vexflow.RenderContext): elements.System {
    const measures = this.getMeasures().map((measure) => measure.render(ctx));

    return new elements.System(ctx, measures);
  }
}
