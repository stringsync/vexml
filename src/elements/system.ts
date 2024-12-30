import * as vexflow from 'vexflow';
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

  setContext(ctx: vexflow.RenderContext): this {
    for (const measure of this.measures) {
      measure.setContext(ctx);
    }
    return this;
  }

  draw(): this {
    for (const measure of this.measures) {
      measure.draw();
    }
    return this;
  }
}
