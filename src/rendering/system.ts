import * as elements from '@/elements';
import * as data from '@/data';
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

  render(): elements.System {
    const measures = this.renderMeasures();
    return new elements.System(measures);
  }

  private renderMeasures(): elements.Measure[] {
    return this.data.system.measures
      .map((measure) => new Measure(this.config, this.log, this.document, { measure }))
      .map((measure) => measure.render());
  }
}
