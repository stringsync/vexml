import { FontInfo, RenderContext } from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Point } from '@/spatial';
import { Padding, RenderLayer } from './types';
import { Spacer } from './spacer';
import { TextMeasurer } from './textmeasurer';
import { Renderable } from './renderable';

export class Label extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private text: string,
    private position: Point,
    private padding: Padding,
    private font: {
      color?: string;
      family?: string;
      size?: string;
    }
  ) {
    super();
  }

  layer(): RenderLayer {
    return 'any';
  }

  children(): Renderable[] {
    const textMeasurer = this.getTextMeasurer();
    const paddingTop = this.padding.top ?? 0;
    const paddingBottom = this.padding.bottom ?? 0;
    const paddingLeft = this.padding.left ?? 0;
    const paddingRight = this.padding.right ?? 0;

    return [
      Spacer.rect(
        this.position.x - paddingLeft,
        this.position.y - paddingTop,
        textMeasurer.getWidth() + paddingLeft + paddingRight,
        textMeasurer.getApproximateHeight() + paddingTop + paddingBottom
      ),
    ];
  }

  render(ctx: RenderContext): void {
    ctx.save();

    ctx.scale(1, 1);

    if (this.font.color) {
      ctx.setFillStyle(this.font.color);
    }

    const fontInfo: FontInfo = {};
    if (this.font.family) {
      fontInfo.family = this.font.family;
    }
    if (this.font.size) {
      fontInfo.size = this.font.size;
    }
    if (Object.keys(fontInfo).length > 0) {
      ctx.setFont(fontInfo);
    }

    ctx.fillText(this.text, this.position.x, this.position.y);

    ctx.restore();
  }

  private getTextMeasurer(): TextMeasurer {
    return new TextMeasurer({
      text: this.text,
      fontSize: this.font.size ?? '',
      fontFamily: this.font.family ?? '',
    });
  }
}
