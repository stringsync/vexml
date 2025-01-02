import * as vexflow from 'vexflow';

type Box = { x: number; y: number; w: number; h: number };

export class Rect {
  private bounds: Box;
  private strokeStyle: string | null;
  private fillStyle: string | null;

  constructor(opts: { bounds: Box; strokeStyle: string | null; fillStyle: string | null }) {
    this.bounds = opts.bounds;
    this.strokeStyle = opts.strokeStyle;
    this.fillStyle = opts.fillStyle;
  }

  draw(vfContext: vexflow.RenderContext): void {
    vfContext.save();

    if (this.strokeStyle) {
      vfContext.setStrokeStyle(this.strokeStyle);
      vfContext.beginPath();
      vfContext.rect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
      vfContext.stroke();
      vfContext.closePath();
    }

    if (this.fillStyle) {
      vfContext.setFillStyle(this.fillStyle);
      vfContext.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
    }

    vfContext.restore();
  }
}
