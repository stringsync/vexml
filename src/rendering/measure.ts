import * as elements from '@/elements';
import * as data from '@/data';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Fragment } from './fragment';
import { Gap } from './gap';

export class Measure {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private data: { measure: data.Measure }
  ) {}

  render(): elements.Measure {
    const entries = this.renderEntries();
    return new elements.Measure(entries);
  }

  private renderEntries(): Array<elements.Fragment | elements.Gap> {
    return this.data.measure.entries
      .map((entry) => {
        switch (entry.type) {
          case 'fragment':
            return new Fragment(this.config, this.log, this.document, { fragment: entry });
          case 'gap':
            return new Gap(this.config, this.log, this.document, { gap: entry });
        }
      })
      .map((entry) => entry.render());
  }
}
