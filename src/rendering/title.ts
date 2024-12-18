import { Config } from '@/config';
import * as debug from '@/debug';
import * as drawables from '@/drawables';
import * as util from '@/util';

export type TitleRendering = {
  type: 'title';
  text: drawables.Text;
  approximateHeight: number;
};

/** Represents the title of the score. */
export class Title {
  private config: Config;
  private log: debug.Logger;
  private text: string;

  constructor(opts: { config: Config; log: debug.Logger; text: string }) {
    this.config = opts.config;
    this.log = opts.log;
    this.text = opts.text;
  }

  /** Whether the title has text. */
  hasText(): boolean {
    return this.text.length > 0;
  }

  /** Renders the title. */
  render(opts: { y: number; containerWidth: number }): TitleRendering {
    this.log.debug('rendering title', { text: this.text });

    const width = this.getWidth();
    const x = (opts.containerWidth - width) / 2;
    const y = opts.y;
    const content = this.text;
    const size = this.config.TITLE_FONT_SIZE;
    const family = this.config.TITLE_FONT_FAMILY;
    const approximateHeight = this.getApproximateHeight();

    const text = new drawables.Text({ content, x, y, size, family });

    return {
      type: 'title',
      text,
      approximateHeight,
    };
  }

  @util.memoize()
  private getTextMetrics(): TextMetrics {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      throw new Error('unable to get canvas rendering context');
    }

    context.font = `${this.config.TITLE_FONT_SIZE} ${this.config.TITLE_FONT_FAMILY}`;

    return context.measureText(this.text);
  }

  private getWidth(): number {
    return this.getTextMetrics().width;
  }

  private getApproximateHeight(): number {
    const textMetrics = this.getTextMetrics();
    return textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
  }
}
