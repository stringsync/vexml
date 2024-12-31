import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey, Renderable, RenderContext, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { Part } from './part';
import { Pen } from './pen';
import { PartLabel } from './partlabel';

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
  private getPartLabels(pen: Pen): Array<PartLabel | null> {
    const partCount = this.document.getPartCount(this.key);

    const isFirstSystem = this.key.systemIndex === 0;
    const isFirstMeasure = this.key.measureIndex === 0;
    if (!isFirstSystem || !isFirstMeasure) {
      return new Array<PartLabel | null>(partCount).fill(null);
    }

    const keys = this.document.getParts(this.key).map<PartKey>((_, partIndex) => ({ ...this.key, partIndex }));

    // Right-align the part labels.
    const partLabelWidths = keys
      .map((key) => new PartLabel(this.config, this.log, this.document, key, Point.origin()))
      .map((partLabel) => partLabel.rect().w);
    const maxPartLabelWidth = util.max(partLabelWidths);
    const partLabelXValues = partLabelWidths.map((width) => pen.position().x + (maxPartLabelWidth - width));

    const parts = keys.map((key) => new Part(this.config, this.log, this.document, key, Point.origin(), null, null));

    const partLabels = new Array<PartLabel>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const x = partLabelXValues[partIndex];
      const part = parts[partIndex];
      const h = part.getStaveHeight();

      const y = pen.position().y + h / 2;

      const partLabel = new PartLabel(this.config, this.log, this.document, keys[partIndex], new Point(x, y));
      partLabels.push(partLabel);

      pen.moveBy({ dy: part.rect().h });
    }

    return partLabels;
  }
}
