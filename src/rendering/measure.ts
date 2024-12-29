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

  render(ctx: vexflow.RenderContext, x: number, y: number): elements.Measure {
    const measure = this.document.getMeasure(this.key);

    const entryElements = new Array<elements.Fragment | elements.Gap>();

    for (const entry of this.getEntries()) {
      if (entry instanceof Fragment) {
        const fragmentElement = entry.render(ctx, x, y);
        entryElements.push(fragmentElement);
        x += fragmentElement.getRect().w;
      } else if (entry instanceof Gap) {
        const gapElement = entry.render(ctx, x, y);
        entryElements.push(gapElement);
        x += gapElement.getRect().w;
      }
    }

    return new elements.Measure(measure.label, entryElements);
  }
}
