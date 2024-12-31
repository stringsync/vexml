import * as drawing from '@/drawing';
import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { TextMeasurer } from './textmeasurer';
import { Renderable, RenderContext, RenderLayer } from './types';
import { Spacer } from './spacer';

export class Title implements Renderable {
  constructor(private config: Config, private log: Logger, private document: Document, private position: Point) {}

  layer(): RenderLayer {
    return 'any';
  }

  @util.memoize()
  rect(): Rect {
    const textMeasurer = this.getTextMeasurer();
    const textRect = new Rect(
      this.position.x,
      this.position.y,
      textMeasurer.getWidth(),
      textMeasurer.getApproximateHeight()
    );
    const spacers = this.getSpacers();
    return Rect.merge([textRect, ...spacers.map((spacer) => spacer.rect())]);
  }

  @util.memoize()
  children(): Renderable[] {
    return [];
  }

  render(ctx: RenderContext): void {
    this.getTextDrawing().draw(ctx);
  }

  private getText(): string {
    const text = this.document.getTitle();
    util.assertNotNull(text);
    return text;
  }

  private getSpacers(): Spacer[] {
    return [Spacer.vertical(this.position.y, this.position.y + this.config.TITLE_PADDING_BOTTOM)];
  }

  private getTextDrawing(): drawing.Text {
    return new drawing.Text({
      content: this.getText(),
      x: this.position.x,
      y: this.position.y,
      color: 'black',
      family: this.config.TITLE_FONT_FAMILY,
      size: this.config.TITLE_FONT_SIZE,
    });
  }

  private getTextMeasurer(): TextMeasurer {
    return new TextMeasurer({
      text: this.getText(),
      fontSize: this.config.TITLE_FONT_SIZE,
      fontFamily: this.config.TITLE_FONT_FAMILY,
    });
  }
}
