import * as util from '@/util';
import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';

export class Fragment {
  constructor(private ctx: vexflow.RenderContext) {}

  @util.memoize()
  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }

  draw(): this {
    return this;
  }
}
