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

  render(ctx: vexflow.RenderContext, y: number): elements.System {
    let x = 0;

    const measureElements = new Array<elements.Measure>();

    for (const measure of this.getMeasures()) {
      const measureElement = measure.render(ctx, x, y);
      measureElements.push(measureElement);
      x += measureElement.getRect().w;
    }

    return new elements.System(ctx, measureElements);
  }
}
