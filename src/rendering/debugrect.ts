import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Label, LabelFont } from './label';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Padding } from './types';

const DEFAULT_STYLE_FONT_COLOR = 'rgb(230, 0, 0)';
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

    const padding: Padding = {};
    const font: LabelFont = {
      color: DEFAULT_STYLE_FONT_COLOR,
      size: '8px',
      family: 'monospace',
    };

    // Draw the main label in the bottom left corner.
    if (this.label) {
      const bottomLeft = this.rect.bottomLeft();
      const position = new Point(bottomLeft.x + 1, bottomLeft.y - 1);
      Label.singleLine(this.config, this.log, this.label, position, padding, font).setContext(ctx).draw();
    }

    // Draw the height label on the middle of the left side.
    const heightLabelPosition = new Point(this.rect.x + 1, this.rect.center().y + 3);
    const heightLabel = `${Math.round(this.rect.h)}`;
    Label.singleLine(this.config, this.log, heightLabel, heightLabelPosition, padding, font).setContext(ctx).draw();

    // Draw the width label on the middle of the bottom side.
    const widthLabelPosition = new Point(this.rect.center().x, this.rect.y + this.rect.h - 1);
    const widthLabel = `${Math.round(this.rect.w)}`;
    Label.singleLine(this.config, this.log, widthLabel, widthLabelPosition, padding, font).setContext(ctx).draw();

    // Draw the position label on the top left corner.
    const positionLabelPosition = new Point(this.rect.x + 1, this.rect.y + 8);
    const positionLabel = `${Math.round(this.rect.x)},${Math.round(this.rect.y)}`;
    Label.singleLine(this.config, this.log, positionLabel, positionLabelPosition, padding, font).setContext(ctx).draw();

    this.drawRect(this.rect);

    ctx.restore();

    return this;
  }

  private drawRect(rect: Rect): void {
    const ctx = this.ctx;
    util.assertNotNull(ctx);

    ctx.save();

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
  }
}
