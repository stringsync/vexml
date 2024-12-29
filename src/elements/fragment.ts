import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';
import { Part } from './part';

export class Fragment {
  constructor(private ctx: vexflow.RenderContext, private parts: Part[]) {}

  getParts(): Part[] {
    return this.parts;
  }

  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }

  draw(): this {
    for (const part of this.parts) {
      part.draw();
    }
    return this;
  }
}
