import * as elements from '@/elements';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Fragment } from './fragment';
import { Gap } from './gap';
import { MeasureKey } from './types';

export class Measure {
  constructor(private config: Config, private log: Logger, private document: Document, private key: MeasureKey) {}

  getEntries(): Array<Fragment | Gap> {
    return this.document.getMeasureEntries(this.key).map((measureEntry, measureEntryIndex) => {
      const key = { ...this.key, measureEntryIndex };
      switch (measureEntry.type) {
        case 'fragment':
          return new Fragment(this.config, this.log, this.document, key);
        case 'gap':
          return new Gap(this.config, this.log, this.document, key);
      }
    });
  }

  render(ctx: vexflow.RenderContext): elements.Measure {
    const measure = this.document.getMeasure(this.key);

    const entries = this.getEntries().map((entry) => entry.render(ctx));

    return new elements.Measure(measure.label, entries);
  }
}
