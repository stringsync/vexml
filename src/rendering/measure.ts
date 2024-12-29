import * as data from '@/data';
import * as elements from '@/elements';
import * as vexflow from 'vexflow';
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

  getEntries(): Array<Fragment | Gap> {
    return [];
  }

  render(ctx: vexflow.RenderContext): elements.Measure {
    const entries = this.getEntries().map((entry) => entry.render());

    return new elements.Measure(this.data.measure.label, []);
  }
}
