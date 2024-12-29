import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';

export class Gap {
  constructor(private ctx: vexflow.RenderContext) {}

  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }

  draw(): this {
    return this;
  }
}
