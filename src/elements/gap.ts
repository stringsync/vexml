import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';

export class Gap {
  constructor() {}

  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }

  setContext(ctx: vexflow.RenderContext): this {
    return this;
  }

  draw(): this {
    return this;
  }
}
