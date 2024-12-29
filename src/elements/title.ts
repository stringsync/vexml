import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import * as spatial from '@/spatial';

export class Title {
  constructor(
    private ctx: vexflow.RenderContext,
    private rect: spatial.Rect,
    private text: drawing.Text,
    private textContent: string
  ) {}

  getRect(): spatial.Rect {
    return this.rect;
  }

  getText(): string {
    return this.textContent;
  }

  draw(): this {
    this.text.draw(this.ctx);
    return this;
  }
}
