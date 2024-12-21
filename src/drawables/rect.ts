import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';

export class Rect {
  private rect: spatial.Rect;
  private strokeStyle?: string;
  private fillStyle?: string;

  constructor(opts: { rect: spatial.Rect; strokeStyle?: string; fillStyle?: string }) {
    this.rect = opts.rect;
    this.strokeStyle = opts.strokeStyle;
    this.fillStyle = opts.fillStyle;
  }

  draw(vfContext: vexflow.RenderContext): void {
    vfContext.save();

    if (this.strokeStyle) {
      vfContext.setStrokeStyle(this.strokeStyle);
      vfContext.rect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
      vfContext.stroke();
    }

    if (this.fillStyle) {
      vfContext.setFillStyle(this.fillStyle);
      vfContext.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
    }

    vfContext.restore();
  }
}
