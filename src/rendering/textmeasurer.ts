import * as util from '@/util';
import { LabelFont } from './label';

export class TextMeasurer {
  constructor(private font: LabelFont) {}

  measure(text: string) {
    const ctx = document.createElement('canvas').getContext('2d');
    util.assertNotNull(ctx);

    const fontSize = this.font.size || '16px';
    const fontFamily = this.font.family || 'Arial, sans-serif';
    ctx.font = `${fontSize} ${fontFamily}`;

    const metrics = ctx.measureText(text);

    return {
      width: metrics.width,
      approximateHeight: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    };
  }
}
