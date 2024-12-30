import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Part } from './part';

export class Fragment {
  constructor(private parts: Part[]) {}

  getParts(): Part[] {
    return this.parts;
  }

  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }

  setContext(ctx: vexflow.RenderContext): this {
    for (const part of this.parts) {
      part.setContext(ctx);
    }
    return this;
  }

  draw(): this {
    for (const part of this.parts) {
      part.draw();
    }
    return this;
  }
}
