import * as vexflow from 'vexflow';

/** An element that renders text to the notation. */
export class Text {
  private content: string;
  private x: number;
  private y: number;
  private color: string | undefined;
  private size: number | undefined;
  private italic: boolean | undefined;

  constructor(opts: { content: string; x: number; y: number; color?: string; size?: number; italic?: boolean }) {
    this.content = opts.content;
    this.x = opts.x;
    this.y = opts.y;
    this.color = opts.color;
    this.size = opts.size;
    this.italic = opts.italic;
  }

  /** Draws the text element. */
  draw(vfContext: vexflow.RenderContext) {
    if (!this.content) {
      return;
    }

    vfContext.save();

    if (typeof this.color === 'string') {
      vfContext.setFillStyle(this.color);
    }

    const fontInfo = this.getFontInfo();
    if (Object.keys(fontInfo).length > 0) {
      vfContext.setFont(fontInfo);
    }

    vfContext.fillText(this.content, this.x, this.y);
    vfContext.restore();
  }

  private getFontInfo(): vexflow.FontInfo {
    const fontInfo: vexflow.FontInfo = {};

    if (typeof this.size === 'number') {
      fontInfo.size = this.size;
    }
    if (this.italic) {
      fontInfo.style = 'italic';
    }

    return fontInfo;
  }
}
