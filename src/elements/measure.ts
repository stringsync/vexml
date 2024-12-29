import * as util from '@/util';
import * as spatial from '@/spatial';
import { Fragment } from './fragment';

export class Measure {
  constructor(private fragments: Fragment[]) {}

  @util.memoize()
  getRect() {
    return spatial.Rect.merge(this.fragments.map((fragment) => fragment.getRect()));
  }

  getFragments(): Fragment[] {
    return this.fragments;
  }
}
