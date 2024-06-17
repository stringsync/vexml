import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';

export class Rect {
  private rect: spatial.Rect;
  private strokeStyle?: string;

  constructor(opts: { rect: spatial.Rect; strokeStyle?: string }) {
    this.rect = opts.rect;
    this.strokeStyle = opts.strokeStyle;
  }

  draw(vfContext: vexflow.RenderContext): void {
    vfContext.save();
    vfContext.setStrokeStyle(this.strokeStyle ?? 'black');
    vfContext.rect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
    vfContext.stroke();
    vfContext.restore();
  }
}
