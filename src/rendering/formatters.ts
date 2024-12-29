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

  constructor(private config: Config, private log: Logger, private elements: { score: elements.Score }) {
    util.assertNotNull(this.config.WIDTH);
    this.w = this.config.WIDTH;
  }

  format(): Document {
    this.y = this.config.TOP_PADDING;

    const document = new data.Document(this.formatScore(this.elements.score));
    return new Document(document);
  }

  private formatScore(score: elements.Score): data.Score {
    const result: data.Score = {
      type: 'score',
      title: null,
      partLabels: [],
      systems: [],
      width: null,
      height: null,
    };

    const title = score.getTitle();

    result.title = this.formatTitle(title);
    // TODO: This probably needs to be positioned, especially for paged formatting.
    result.partLabels = score.getPartLabels();
    result.systems = this.formatSystems(score);

    result.width = this.w;
    result.height = this.y + this.config.BOTTOM_PADDING;

    return result;
  }

  private formatTitle(title: elements.Title | null): data.Title | null {
    if (!title) {
      return null;
    }

    const result: data.Title = {
      type: 'title',
      text: '',
      x: null,
      y: null,
    };

    result.text = title.getText();

    const rect = title.getRect();
    result.x = this.w / 2 - rect.w / 2;
    result.y = this.y;

    this.y += rect.h;

    return result;
  }

  private formatSystems(score: elements.Score): data.System[] {
    const measures = score.getSystems().flatMap((system) => system.getMeasures());
    this.log.debug('formatting measures', { length: measures.length, width: this.w });

    // TODO: After measures are rendered, format them into systems based on the width.

    return [];
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
