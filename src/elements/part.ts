import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Stave } from './stave';

export class Part {
  constructor(private staves: Stave[]) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.staves.map((stave) => stave.getRect()));
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  setContext(ctx: vexflow.RenderContext): this {
    for (const stave of this.staves) {
      stave.setContext(ctx);
    }
    return this;
  }

  draw(): this {
    for (const stave of this.staves) {
      stave.draw();
    }
    return this;
  }
}
