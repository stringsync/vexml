import * as drawing from '@/drawing';
import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';
import * as util from '@/util';

export class PartLabel {
  private ctx: vexflow.RenderContext | null = null;

  constructor(private rect: spatial.Rect, private text: drawing.Text, private label: string) {}

  getRect(): spatial.Rect {
    return this.rect;
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.ctx = ctx;
    return this;
  }

  draw(): this {
    util.assertNotNull(this.ctx);
    this.text.draw(this.ctx);
    return this;
  }
}
