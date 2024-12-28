import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { TextMeasurer } from './textmeasurer';

export class Title {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(ctx: vexflow.RenderContext, point: spatial.Point): elements.Title {
    const content = this.document.getScore().title;
    const fontFamily = this.config.TITLE_FONT_FAMILY;
    const fontSize = this.config.TITLE_FONT_SIZE;

    const text = new drawing.Text({
      content,
      x: point.x,
      y: point.y,
      color: 'black',
      family: fontFamily,
      size: fontSize,
    });

    const textMeasurer = new TextMeasurer({ text: content, fontSize, fontFamily });
    const width = textMeasurer.getWidth();
    const height = textMeasurer.getApproximateHeight();
    const rect = new spatial.Rect(point.x, point.y, width, height);

    return new elements.Title(ctx, rect, text);
  }
}
