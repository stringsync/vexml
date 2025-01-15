import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Point, Rect } from '@/spatial';
import { FragmentRender } from './types';
import { TextMeasurer } from './textmeasurer';
import { Label } from './label';

// TODO: Replace this with config, and/or maybe the data should live in data/types.
const DEFAULT_FONT_SIZE = '16px';
const DEFAULT_FONT_FAMILY = 'monospace';
const DEFAULT_STYLE_FONT_COLOR = 'rgb(230, 0, 0)';
const DEFAULT_STYLE_FILL = 'rgba(255, 0, 0, 0.2)';
const DEFAULT_STYLE_STROKE = 'rgba(255, 0, 0, 0.5)';

export type GapOverlayStyle = {
  stroke?: string;
  fill?: string;
};

export class GapOverlay {
  private ctx: vexflow.RenderContext | null = null;

  constructor(
    private config: Config,
    private log: Logger,
    private label: string | null,
    private fragmentRender: FragmentRender,
    private style?: GapOverlayStyle
  ) {
    util.assert(fragmentRender.rectSrc !== 'none'); // This means we can trust the rects.
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.ctx = ctx;
    return this;
  }

  draw(): this {
    const ctx = this.ctx;
    util.assertNotNull(ctx);

    const topRect = this.fragmentRender.partRenders.at(0)?.staveRenders.at(0)?.intrinsicRect;
    util.assertDefined(topRect);

    const bottomRect = this.fragmentRender.partRenders.at(-1)?.staveRenders.at(-1)?.intrinsicRect;
    util.assertDefined(bottomRect);

    const rect = Rect.merge([topRect, bottomRect]);

    ctx.save();

    this.drawRect(rect);

    // Draw the label in the center of the overlay.
    if (this.label) {
      const textMeasurer = new TextMeasurer({ size: DEFAULT_FONT_SIZE, family: DEFAULT_FONT_FAMILY });
      const measurement = textMeasurer.measure(this.label);

      const x = rect.center().x - measurement.width / 2;
      const y = rect.center().y + measurement.approximateHeight / 2;
      const position = new Point(x, y);

      Label.singleLine(
        this.config,
        this.log,
        this.label,
        position,
        {},
        {
          size: DEFAULT_FONT_SIZE,
          family: DEFAULT_FONT_FAMILY,
          color: DEFAULT_STYLE_FONT_COLOR,
        }
      )
        .setContext(ctx)
        .draw();
    }

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
