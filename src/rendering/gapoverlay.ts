import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Point, Rect } from '@/spatial';
import { FragmentRender } from './types';
import { TextMeasurer } from './textmeasurer';
import { Label } from './label';

export type GapOverlayStyle = {
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

    const topRect = this.fragmentRender.partRenders.at(0)?.staveRenders.at(0)?.playableRect;
    util.assertDefined(topRect);

    const bottomRect = this.fragmentRender.partRenders.at(-1)?.staveRenders.at(-1)?.playableRect;
    util.assertDefined(bottomRect);

    const rect = Rect.merge([topRect, bottomRect]);

    ctx.save();

    this.drawRect(rect);

    // Draw the label in the center of the overlay.
    if (this.label) {
      const textMeasurer = new TextMeasurer({
        size: this.config.DEFAULT_GAP_OVERLAY_FONT_SIZE,
        family: this.config.DEFAULT_GAP_OVERLAY_FONT_FAMILY,
      });
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
          size: this.config.DEFAULT_GAP_OVERLAY_FONT_SIZE,
          family: this.config.DEFAULT_GAP_OVERLAY_FONT_FAMILY,
          color: this.config.DEFAULT_GAP_OVERLAY_FONT_COLOR,
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

    const fill = this.style?.fill ?? this.config.DEFAULT_GAP_OVERLAY_FILL_COLOR;
    ctx.setFillStyle(fill);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.restore();
  }
}
