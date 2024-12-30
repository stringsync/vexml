import * as util from '@/util';
import * as elements from '@/elements';
import { Document } from './document';
import { Formatter, SystemArrangement } from './types';
import { Config } from './config';
import { Logger } from '@/debug';

export class UndefinedHeightFormatter implements Formatter {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private elements: { score: elements.Score }
  ) {
    util.assertNotNull(this.config.WIDTH);
    util.assertNull(this.config.HEIGHT);
  }

  format(): Document {
    const systemArrangements = this.getSystemArrangements();
    return this.document.reflow(this.config.WIDTH!, systemArrangements);
  }

  private getSystemArrangements(): SystemArrangement[] {
    const arrangements: SystemArrangement[] = [{ measureIndexes: [] }];
    let remaining = this.config.WIDTH!;

    const measures = this.getMeasureElements();

    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex];

      const required = measure.getRect().w;

      if (required > remaining) {
        arrangements.push({ measureIndexes: [] });
        remaining = this.config.WIDTH!;
      }

      arrangements.at(-1)!.measureIndexes.push(measureIndex);
      remaining -= required;
    }

    this.log.debug(`grouped ${measures.length} measures into ${arrangements.length} systems`);

    return arrangements;
  }

  private getMeasureElements(): elements.Measure[] {
    return this.elements.score.getSystems().flatMap((s) => s.getMeasures());
  }
}

export class UndefinedWidthFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}

export class DefaultFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}

export class PagedFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}
