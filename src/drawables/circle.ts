import * as spatial from '@/spatial';
import * as vexflow from 'vexflow';

export class Circle {
  private circle: spatial.Circle;
  private strokeStyle?: string;

  constructor(opts: { circle: spatial.Circle; strokeStyle?: string }) {
    this.circle = opts.circle;
    this.strokeStyle = opts.strokeStyle;
  }

  draw(vfContext: vexflow.RenderContext): void {
    vfContext.save();
    vfContext.setStrokeStyle(this.strokeStyle ?? 'black');
    vfContext.beginPath();
    vfContext.arc(this.circle.x, this.circle.y, this.circle.r, 0, Math.PI * 2, false);
    vfContext.stroke();
    vfContext.restore();
  }
}
