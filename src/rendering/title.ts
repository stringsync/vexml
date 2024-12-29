import * as vexflow from 'vexflow';
import * as drawing from '@/drawing';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { TextMeasurer } from './textmeasurer';

export class Title {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(ctx: vexflow.RenderContext, x: number, y: number): elements.Title {
    const title = this.document.getTitle();
    util.assertNotNull(title);

    const content = title.text;
    const fontFamily = this.config.TITLE_FONT_FAMILY;
    const fontSize = this.config.TITLE_FONT_SIZE;

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

    return new elements.Title(ctx, rect, text, content);
  }
}
