import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Label, LabelFont } from './label';
import { Config } from './config';
import { Logger } from '@/debug';
import { Padding } from './types';

const DEFAULT_STYLE_FILL = 'rgba(255, 0, 0, 0.2)';
const DEFAULT_STYLE_STROKE = 'rgba(255, 0, 0, 0.5)';

export type DebugRectStyle = {
  stroke?: string;
  fill?: string;
};

export class DebugRect {
  private ctx: vexflow.RenderContext | null = null;

  constructor(
    private config: Config,
    private log: Logger,
    private label: string,
    private rect: Rect,
    private style?: DebugRectStyle
  ) {}

  setContext(ctx: vexflow.RenderContext): this {
    this.ctx = ctx;
    return this;
  }

  draw(): this {
    const ctx = this.ctx;
    util.assertNotNull(ctx);

    ctx.save();

    const rect = this.rect;

    if (this.label) {
      const bottomLeft = this.rect.corners()[3];
      const position = new Point(bottomLeft.x, bottomLeft.y);
      const padding: Padding = {};
      const font: LabelFont = { color: 'black', size: '8px', family: 'monospace' };
      Label.singleLine(this.config, this.log, this.label, position, padding, font).setContext(ctx).draw();
    }

    const stroke = this.style?.stroke ?? DEFAULT_STYLE_STROKE;
    ctx.setStrokeStyle(stroke);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.stroke();
    ctx.closePath();

    const fill = this.style?.fill ?? DEFAULT_STYLE_FILL;
    ctx.setFillStyle(fill);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.restore();

    return this;
  }
}
