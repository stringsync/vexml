import { Config } from './config';
import { Text } from '../drawables/text';

export type TitleRendering = {
  type: 'title';
  text: Text;
  approximateHeight: number;
};

/** Represents the title of the score. */
export class Title {
  private config: Config;
  private text: string;
  private width: number;
  private approximateHeight: number;

  private constructor(opts: { config: Config; text: string; width: number; approximateHeight: number }) {
    this.config = opts.config;
    this.text = opts.text;
    this.width = opts.width;
    this.approximateHeight = opts.approximateHeight;
  }

  static create(opts: { config: Config; text: string }): Title {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      throw new Error('unable to get canvas rendering context');
    }

    const config = opts.config;
    const text = opts.text;

    context.font = `${config.TITLE_FONT_SIZE} ${config.TITLE_FONT_FAMILY}`;

    const textMetrics = context.measureText(text);
    const width = textMetrics.width;
    const approximateHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    return new Title({ config, text, width, approximateHeight });
  }

  /** Whether the title has text. */
  hasText(): boolean {
    return this.text.length > 0;
  }

  /** Renders the title. */
  render(opts: { y: number; containerWidth: number }): TitleRendering {
    const x = (opts.containerWidth - this.width) / 2;
    const y = opts.y;
    const content = this.text;
    const size = this.config.TITLE_FONT_SIZE;
    const family = this.config.TITLE_FONT_FAMILY;

    const text = new Text({ content, x, y, size, family });

    return {
      type: 'title',
      text,
      approximateHeight: this.approximateHeight,
    };
  }
}
