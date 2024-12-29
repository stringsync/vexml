import * as vexflow from 'vexflow';

export class Gap {
  constructor(private ctx: vexflow.RenderContext) {}

  draw(): this {
    return this;
  }
}
