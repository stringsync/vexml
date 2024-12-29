import * as util from '@/util';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import { Point } from '@/spatial';
import { Format } from './types';
import { Config } from './config';

export class PrerenderingFormat implements Format {
  getScoreWidth(): number {
    return 0;
  }
  getScoreHeight(): number {
    return 0;
  }
  getTitlePosition(): Point {
    return Point.origin();
  }
}

export class InfiniteHeightFormat implements Format {
  constructor(private config: Config, private elements: { score: elements.Score }, private width: number) {}

  getScoreWidth(): number {
    return this.width;
  }

  getScoreHeight(): number {
    return this.format().scoreHeight;
  }

  getTitlePosition(): Point {
    return this.format().titlePosition;
  }

  @util.memoize()
  private format() {
    let y = this.config.TOP_PADDING;

    let titlePosition = Point.origin();

    const title = this.elements.score.getTitle();
    if (title) {
      const rect = title.getRect();
      const x = this.width / 2 - rect.w / 2;
      titlePosition = new Point(x, y);
      y += rect.h;
    }

    const scoreHeight = y + this.config.BOTTOM_PADDING;

    return { titlePosition, scoreHeight };
  }
}

export class InfiniteWidthFormat implements Format {
  getScoreWidth(): number {
    throw new Error('Method not implemented.');
  }

  getScoreHeight(): number {
    throw new Error('Method not implemented.');
  }

  getTitlePosition(): Point {
    throw new Error('Method not implemented.');
  }
}

export class PagedFormat implements Format {
  getScoreWidth(): number {
    throw new Error('Method not implemented.');
  }
  getScoreHeight(): number {
    throw new Error('Method not implemented.');
  }
  getTitlePosition(): Point {
    throw new Error('Method not implemented.');
  }
}
