import * as spatial from '@/spatial';
import * as util from '@/util';
import { Measure } from './measure';

export class System {
  constructor(private measures: Measure[]) {}

  @util.memoize()
  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.measures.map((measure) => measure.getRect()));
  }

  getMeasures(): Measure[] {
    return this.measures;
  }
}
