import * as data from '@/data';
import * as util from '@/util';
import * as spatial from '@/spatial';
import { Fragment } from './fragment';
import { Gap } from './gap';

export class Measure {
  constructor(private label: string, private entries: Array<Fragment | Gap>) {}

  @util.memoize()
  getRect() {
    return spatial.Rect.empty();
  }

  getLabel(): string {
    return this.label;
  }

  getEntries(): Array<Fragment | Gap>[] {
    return [];
  }

  draw(): this {
    for (const entry of this.entries) {
      entry.draw();
    }
    return this;
  }
}
