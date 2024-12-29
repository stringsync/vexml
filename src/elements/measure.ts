import * as util from '@/util';
import * as spatial from '@/spatial';
import { Fragment } from './fragment';
import { Gap } from './gap';

export class Measure {
  constructor(private label: string, private entries: Array<Fragment | Gap>) {}

  @util.memoize()
  getRect() {
    return new spatial.Rect(0, 0, 100, 50);
  }

  getLabel(): string {
    return this.label;
  }

  getEntries(): Array<Fragment | Gap> {
    return this.entries;
  }

  draw(): this {
    for (const entry of this.entries) {
      entry.draw();
    }

    return this;
  }
}
