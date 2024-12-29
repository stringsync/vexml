import * as util from '@/util';
import * as elements from '@/elements';
import * as data from '@/data';
import { Document } from './document';
import { Formatter } from './types';
import { Config } from './config';
import { Logger } from '@/debug';

export class UndefinedHeightFormatter implements Formatter {
  private w: number;
  private y = 0;

  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private elements: { score: elements.Score }
  ) {
    util.assertNotNull(this.config.WIDTH);
    this.w = this.config.WIDTH;
  }

  format(): Document {
    this.y = this.config.TOP_PADDING;

    const document = new data.Document(this.document.getScore());
    return new Document(document);
  }
}

export class UndefinedWidthFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}

export class PagedFormatter implements Formatter {
  format(): Document {
    throw new Error('Method not implemented.');
  }
}
