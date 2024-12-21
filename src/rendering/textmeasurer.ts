import * as util from '@/util';

export class TextMeasurer {
  private text: string;
  private fontSize: string;
  private fontFamily: string;

  constructor(opts: { text: string; fontSize: string; fontFamily: string }) {
    this.text = opts.text;
    this.fontSize = opts.fontSize;
    this.fontFamily = opts.fontFamily;
  }

  getWidth(): number {
    return this.getTextMetrics().width;
  }

  getApproximateHeight(): number {
    const textMetrics = this.getTextMetrics();
    return textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
  }

  @util.memoize()
  private getTextMetrics(): TextMetrics {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      throw new Error('unable to get canvas rendering context');
    }

    context.font = `${this.fontSize} ${this.fontFamily}`;

    return context.measureText(this.text);
  }
}
