import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Stave } from './stave';
import { PartLabel } from './partlabel';

export class Part {
  constructor(private partLabel: PartLabel | null, private staves: Stave[]) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.staves.map((stave) => stave.getRect()));
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.partLabel?.setContext(ctx);

    for (const stave of this.staves) {
      stave.setContext(ctx);
    }

    return this;
  }

  draw(): this {
    this.partLabel?.draw();

    for (const stave of this.staves) {
      stave.draw();
    }

    return this;
  }
}
