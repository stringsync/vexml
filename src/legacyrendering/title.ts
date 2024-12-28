import { Config } from '@/config';
import * as debug from '@/debug';
import * as drawing from '@/drawing';
import * as util from '@/util';
import { TextMeasurer } from './textmeasurer';

export type TitleRendering = {
  type: 'title';
  text: drawing.Text;
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

    const fontSize = this.config.TITLE_FONT_SIZE;
    const fontFamily = this.config.TITLE_FONT_FAMILY;
    const textMeasurer = new TextMeasurer({ text: this.text, fontSize, fontFamily });

    const width = textMeasurer.getWidth();
    const x = (opts.containerWidth - width) / 2;
    const y = opts.y;
    const content = this.text;
    const approximateHeight = textMeasurer.getApproximateHeight();

    const text = new drawing.Text({ content, x, y, size: fontSize, family: fontFamily });

    return {
      type: 'title',
      text,
      approximateHeight,
    };
  }
}
