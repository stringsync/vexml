import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';

export class Note {
  constructor(private vexflow: { staveNote: vexflow.StaveNote }) {}

  getRect(): spatial.Rect {
    return spatial.Rect.fromRectLike(this.vexflow.staveNote.getBoundingBox());
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.vexflow.staveNote.setContext(ctx);
    return this;
  }

  getVexflowTickable(): vexflow.Tickable {
    return this.vexflow.staveNote;
  }

  draw(): this {
    return this;
  }
}
