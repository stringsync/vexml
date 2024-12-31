import * as vexflow from 'vexflow';
import * as util from '@/util';
import { FontInfo } from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Point, Rect } from '@/spatial';
import { Drawable, Padding } from './types';
import { TextMeasurer } from './textmeasurer';

export class Label implements Drawable {
  private ctx: vexflow.RenderContext | null = null;

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
  ) {}

  @util.memoize()
  rect(): Rect {
    const textMeasurer = this.getTextMeasurer();
    const paddingTop = this.padding.top ?? 0;
    const paddingBottom = this.padding.bottom ?? 0;
    const paddingLeft = this.padding.left ?? 0;
    const paddingRight = this.padding.right ?? 0;

    return new Rect(
      this.position.x - paddingLeft,
      this.position.y - paddingTop,
      textMeasurer.getWidth() + paddingLeft + paddingRight,
      textMeasurer.getApproximateHeight() + paddingTop + paddingBottom
    );
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.ctx = ctx;
    return this;
  }

  draw(): this {
    const ctx = this.ctx;
    util.assertNotNull(ctx);

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

    return this;
  }

  private getTextMeasurer(): TextMeasurer {
    return new TextMeasurer({
      text: this.text,
      fontSize: this.font.size ?? '',
      fontFamily: this.font.family ?? '',
    });
  }
}
