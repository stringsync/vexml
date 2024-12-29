import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import * as spatial from '@/spatial';

export class Title {
  constructor(private ctx: vexflow.RenderContext, private rect: spatial.Rect, private text: drawing.Text) {}

  getRect(): spatial.Rect {
    return this.rect;
  }

  draw(): this {
    this.text.draw(this.ctx);
    return this;
  }
}
