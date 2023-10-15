import * as vexflow from 'vexflow';

/**
 * An element that renders text to the notation.
 *
 * This is more like a lower level vexflow element, and therefore doesn't follow the typical create/render pattern as
 * other rendering objects in the rendering lib.
 */
export class Text {
  private content: string;
  private x: number;
  private y: number;
  private family: string | undefined;
  private color: string | undefined;
  private size: string | undefined;
  private italic: boolean | undefined;

  constructor(opts: {
    content: string;
    x: number;
    y: number;
    family?: string | undefined;
    color?: string;
    size?: string;
    italic?: boolean;
  }) {
    this.content = opts.content;
    this.x = opts.x;
    this.y = opts.y;
    this.family = opts.family;
    this.color = opts.color;
    this.size = opts.size;
    this.italic = opts.italic;
  }

  /** Draws the text element. */
  draw(vfContext: vexflow.RenderContext): void {
    if (!this.content) {
      return;
    }

    vfContext.save();

    vfContext.scale(1, 1);

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

    if (typeof this.family === 'string') {
      fontInfo.family = this.family;
    }
    if (typeof this.size === 'string') {
      fontInfo.size = this.size;
    }
    if (this.italic) {
      fontInfo.style = 'italic';
    }

    return fontInfo;
  }
}
