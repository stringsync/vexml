import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { TextMeasurer } from './textmeasurer';
import { Format } from './types';

export class Title {
  constructor(private config: Config, private log: Logger, private document: Document, private format: Format) {}

  render(ctx: vexflow.RenderContext): elements.Title {
    const content = this.document.getScore().title;
    const fontFamily = this.config.TITLE_FONT_FAMILY;
    const fontSize = this.config.TITLE_FONT_SIZE;

    const { x, y } = this.format.getTitlePosition();

    const text = new drawing.Text({
      content,
      x,
      y,
      color: 'black',
      family: fontFamily,
      size: fontSize,
    });

    const textMeasurer = new TextMeasurer({ text: content, fontSize, fontFamily });
    const w = textMeasurer.getWidth();
    const h = textMeasurer.getApproximateHeight();
    const rect = new spatial.Rect(x, y, w, h);

    return new elements.Title(ctx, rect, text);
  }
}
