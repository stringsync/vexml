import { Config } from './config';
import * as drawables from '@/drawables';
import * as util from '@/util';

const PART_NAME_PADDING_RIGHT = 8;

export type PartNameRendering = {
  type: 'partname';
  text: drawables.Text;
};

/** Represents a part name within a score. */
export class PartName {
  private config: Config;
  private content: string;

  constructor(opts: { config: Config; content: string }) {
    this.config = opts.config;
    this.content = opts.content;
  }

  /** Returns the approximate height of the part name. */
  getApproximateHeight(): number {
    const textMetrics = this.getTextMetrics();
    return textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
  }

  /** Returns the width that the part name spans. */
  getWidth(): number {
    return this.getTextMetrics().width + PART_NAME_PADDING_RIGHT;
  }

  /** Renders the title. */
  render(opts: { x: number; y: number }): PartNameRendering {
    const text = new drawables.Text({
      x: opts.x,
      y: opts.y,
      content: this.content,
      size: this.config.PART_NAME_FONT_SIZE,
      family: this.config.PART_NAME_FONT_FAMILY,
    });

    return {
      type: 'partname',
      text,
    };
  }

  @util.memoize()
  private getTextMetrics(): TextMetrics {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      throw new Error('unable to get canvas rendering context');
    }

    context.font = `${this.config.PART_NAME_FONT_SIZE} ${this.config.PART_NAME_FONT_FAMILY}`;

    return context.measureText(this.content);
  }
}
