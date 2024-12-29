import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';

export class Note {
  constructor(private ctx: vexflow.RenderContext, private vexflow: { staveNote: vexflow.StaveNote }) {}

  getRect(): spatial.Rect {
    return spatial.Rect.fromRectLike(this.vexflow.staveNote.getBoundingBox());
  }

  draw(): this {
    return this;
  }

  getVexflowTickable(): vexflow.Tickable {
    return this.vexflow.staveNote;
  }
}
