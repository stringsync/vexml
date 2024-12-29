import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';

export class Note {
  constructor(private ctx: vexflow.RenderContext, private vexflow: { staveNote: vexflow.StaveNote }) {}

  getRect(): spatial.Rect {
    return spatial.Rect.fromRectLike(this.vexflow.staveNote.getBoundingBox());
  }

  draw(): this {
    this.vexflow.staveNote.setContext(this.ctx).draw();

    return this;
  }
}
