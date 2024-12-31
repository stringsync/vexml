import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, Padding, PartKey, Renderable, RenderContext, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { Part } from './part';
import { Pen } from './pen';
import { Label } from './label';

export class Fragment implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  layer(): RenderLayer {
    return 'any';
  }

  @util.memoize()
  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  @util.memoize()
  children(): Renderable[] {
    const children = new Array<Renderable>();

    const pen = new Pen(this.position);

    for (const part of this.getParts(pen.clone())) {
      children.push(part);
    }

    return children;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext): void {}

  private getParts(pen: Pen): Part[] {
    const partCount = this.document.getPartCount(this.key);

    const partLabels = this.getPartLabels(pen.clone());

    const parts = new Array<Part>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partLabel = partLabels[partIndex];
      const part = new Part(this.config, this.log, this.document, key, pen.position(), partLabel, this.width);
      parts.push(part);
      pen.moveBy({ dy: part.rect().h });
    }

    return parts;
  }

  /**
   * Conditionally creates part labels for each part in the fragment.
   *
   * The reason why we determine this here is because the parts depend on each other for label positioning. Fragment
   * has access to all parts in the fragment, so it can determine the part label positions.
   *
   *   - The maximum part label width allows you to order to right-align the part labels.
   *   - The part stave height (without the voice entries) allows you to center the part label vertically relative to
   *     the staves.
   *   - The part height (with the voice entries) determines the vertical spacing between part labels.
   */
  private getPartLabels(pen: Pen): Array<Label | null> {
    const partCount = this.document.getPartCount(this.key);

    const isFirstSystem = this.key.systemIndex === 0;
    const isFirstMeasure = this.key.measureIndex === 0;
    if (!isFirstSystem || !isFirstMeasure) {
      return new Array<Label | null>(partCount).fill(null);
    }

    const padding = { right: this.config.PART_LABEL_PADDING_RIGHT };
    const font = {
      color: 'black',
      family: this.config.PART_LABEL_FONT_FAMILY,
      size: this.config.PART_LABEL_FONT_SIZE,
    };

    const keys = this.document.getParts(this.key).map<PartKey>((_, partIndex) => ({ ...this.key, partIndex }));

    // Right-align the part labels.
    const labelWidths = keys
      .map((key) => {
        const text = this.document.getPartLabel(key);
        return new Label(this.config, this.log, text, Point.origin(), padding, font);
      })
      .map((label) => label.rect().w);
    const maxLabelWidth = util.max(labelWidths);
    const labelXPositions = labelWidths.map((width) => pen.position().x + (maxLabelWidth - width));

    const parts = keys.map((key) => new Part(this.config, this.log, this.document, key, Point.origin(), null, null));

    const partLabels = new Array<Label>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key = keys[partIndex];
      const text = this.document.getPartLabel(key);
      const part = parts[partIndex];

      const x = labelXPositions[partIndex];
      const h = part.getStaveHeight();
      const y = pen.position().y + h / 2;
      const position = new Point(x, y);

      const label = new Label(this.config, this.log, text, position, padding, font);
      partLabels.push(label);

      pen.moveBy({ dy: part.rect().h });
    }

    return partLabels;
  }
}
