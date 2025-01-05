import * as util from '@/util';
import { Document } from './document';
import { Formatter, SystemArrangement } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { ScoreRender } from './score';

export class UndefinedHeightFormatter implements Formatter {
  constructor(private config: Config, private log: Logger, private scoreRender: ScoreRender) {
    util.assertNotNull(this.config.WIDTH);
    util.assertNull(this.config.HEIGHT);
  }

  format(document: Document): Document {
    const systemArrangements = this.getSystemArrangements();
    return document.reflow(systemArrangements);
  }

  private getSystemArrangements(): SystemArrangement[] {
    const arrangements: SystemArrangement[] = [{ from: 0, to: -1 }];
    let remaining = this.config.WIDTH!;

    const measureRenders = this.scoreRender.systemRenders.flatMap((systemRender) => systemRender.measureRenders);

    for (let measureIndex = 0; measureIndex < measureRenders.length; measureIndex++) {
      const measure = measureRenders[measureIndex];

      const required = measure.rect.w;

      if (required > remaining) {
        arrangements.push({ from: measure.absoluteIndex, to: measure.absoluteIndex });
        remaining = this.config.WIDTH!;
      }

      arrangements.at(-1)!.to = measure.absoluteIndex;
      remaining -= required;
    }

    this.log.debug(`grouped ${measureRenders.length} measures into ${arrangements.length} system(s)`);

    return arrangements;
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
