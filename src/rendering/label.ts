import * as vexflow from 'vexflow';
import * as util from '@/util';
import { FontInfo } from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Point, Rect } from '@/spatial';
import { Drawable, Padding } from './types';
import { Pen } from './pen';
import { TextMeasurer } from './textmeasurer';

export type LabelFont = {
  color?: string;
  family?: string;
  size?: string;
  lineHeight?: number;
};

type LabelLine = {
  text: string;
  rect: Rect;
};

type LabelFragment = {
  text: string;
  width: number;
  height: number;
};

export class Label implements Drawable {
  private ctx: vexflow.RenderContext | null = null;

  private constructor(
    private config: Config,
    private log: Logger,
    private lines: LabelLine[],
    private font: LabelFont,
    public readonly rect: Rect
  ) {}

  static singleLine(
    config: Config,
    log: Logger,
    textContent: string,
    position: Point,
    padding: Padding,
    font: LabelFont
  ): Label {
    const fragments = Label.split(textContent, font, Infinity);
    const pen = new Pen(position);
    const lines = new Array<LabelLine>();

    for (const fragment of fragments) {
      const paddingLeft = padding.left ?? 0;
      const paddingRight = padding.right ?? 0;
      const paddingTop = padding.top ?? 0;
      const paddingBottom = padding.bottom ?? 0;

      const x = pen.x - paddingLeft;
      const y = pen.y - paddingTop - fragment.height;
      const w = fragment.width + paddingLeft + paddingRight;
      const h = fragment.height + paddingTop + paddingBottom;

      const rect = new Rect(x, y, w, h);

      lines.push({ text: fragment.text, rect });
    }

    const rect = Rect.merge(lines.map((line) => line.rect));

    return new Label(config, log, lines, font, rect);
  }

  static centerAligned(
    config: Config,
    log: Logger,
    maxWidth: number,
    textContent: string,
    position: Point,
    padding: Padding,
    font: LabelFont
  ): Label {
    const fragments = Label.split(textContent, font, maxWidth);
    const pen = new Pen(position);
    const lines = new Array<LabelLine>();

    for (const fragment of fragments) {
      const paddingLeft = padding.left ?? 0;
      const paddingRight = padding.right ?? 0;
      const paddingTop = padding.top ?? 0;
      const paddingBottom = padding.bottom ?? 0;

      const x = position.x + (maxWidth - fragment.width) / 2 - paddingLeft;
      const y = pen.y - paddingTop - fragment.height;
      const w = fragment.width + paddingLeft + paddingRight;
      const h = fragment.height + paddingTop + paddingBottom;

      const rect = new Rect(x, y, w, h);

      lines.push({ text: fragment.text, rect });

      const lineHeight = font.lineHeight ?? fragment.height;
      pen.moveTo({ x: position.x, y: pen.y + lineHeight });
    }

    const rect = Rect.merge(lines.map((line) => line.rect));

    return new Label(config, log, lines, font, rect);
  }

  private static split(textContent: string, font: LabelFont, maxWidth: number): LabelFragment[] {
    const words = textContent.split(/\s+/);
    const fragments = new Array<LabelFragment>();

    const textMeasurer = new TextMeasurer(font);
    const spaceWidth = textMeasurer.measure(' ').width;
    let texts = new Array<string>();
    let width = 0;
    let height = 0;

    // Break down the words into fragments that fit within the maxWidth.
    for (let index = 0; index < words.length; index++) {
      const word = words[index];

      const wordMetrics = textMeasurer.measure(word);
      const wordWidth = wordMetrics.width;
      const wordHeight = wordMetrics.approximateHeight;

      const remainingWidth = maxWidth - width;

      if (remainingWidth < wordWidth && texts.length > 0) {
        fragments.push({ text: texts.join(' '), width, height });
        texts = [];
        width = 0;
        height = 0;
      }

      texts.push(word);
      width += wordWidth + spaceWidth;
      height = Math.max(height, wordHeight);

      if (index === words.length - 1 && texts.length > 0) {
        fragments.push({ text: texts.join(' '), width, height });
      }
    }

    return fragments;
  }

  setContext(ctx: vexflow.RenderContext): this {
    this.ctx = ctx;
    return this;
  }

  draw(): this {
    const ctx = this.ctx;
    util.assertNotNull(ctx);

    ctx.save();

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

    for (const line of this.lines) {
      ctx.fillText(line.text, line.rect.x, line.rect.y + line.rect.h);
    }

    ctx.restore();

    return this;
  }
}
