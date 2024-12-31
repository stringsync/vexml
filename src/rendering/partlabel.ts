import * as drawing from '@/drawing';
import * as util from '@/util';
import { Logger } from '@/debug';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { PartLabelKey, Renderable, RenderContext, RenderLayer } from './types';
import { Document } from './document';
import { TextMeasurer } from './textmeasurer';

export class PartLabel {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartLabelKey,
    private position: Point
  ) {}

  layer(): RenderLayer {
    return 'any';
  }

  rect(): Rect {
    const textMeasurer = this.getTextMeasurer();
    const textRect = new Rect(
      this.position.x,
      this.position.y,
      textMeasurer.getWidth(),
      textMeasurer.getApproximateHeight()
    );
    return textRect;
  }

  children(): Renderable[] {
    return [];
  }

  render(ctx: RenderContext): void {
    this.getTextDrawing().draw(ctx);
  }

  private getText(): string {
    const partLabel = this.document.getPartLabel(this.key);
    util.assertNotNull(partLabel);
    return partLabel;
  }

  private getTextDrawing(): drawing.Text {
    return new drawing.Text({
      content: this.getText(),
      x: this.position.x,
      y: this.position.y,
      color: 'black',
      family: this.config.PART_LABEL_FONT_FAMILY,
      size: this.config.PART_LABEL_FONT_SIZE,
    });
  }

  private getTextMeasurer(): TextMeasurer {
    return new TextMeasurer({
      text: this.getText(),
      fontSize: this.config.PART_LABEL_FONT_SIZE,
      fontFamily: this.config.PART_LABEL_FONT_FAMILY,
    });
  }
}
