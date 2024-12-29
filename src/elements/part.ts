import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Stave } from './stave';

export class Part {
  constructor(private ctx: vexflow.RenderContext, private staves: Stave[]) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.staves.map((stave) => stave.getRect()));
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  draw(): this {
    for (const stave of this.staves) {
      stave.draw();
    }
    return this;
  }
}
