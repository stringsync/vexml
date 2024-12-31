import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey, PartLabelKey } from './types';
import { Point, Rect } from '@/spatial';
import { Part, PartRender } from './part';
import { Pen } from './pen';
import { Label } from './label';

export type FragmentRender = {
  type: 'fragment';
  key: MeasureEntryKey;
  rect: Rect;
  partLabelRenders: PartLabelRender[] | null;
  partRenders: PartRender[];
};

export type PartLabelRender = {
  type: 'partLabel';
  key: PartLabelKey;
  rect: Rect;
  label: Label;
};

export class Fragment {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  render(): FragmentRender {
    const pen = new Pen(this.position);

    const partLabelRenders = this.renderPartLabels(pen);
    const partRenders = this.renderParts(pen);

    const rect = Rect.merge(partRenders.map((part) => part.rect));

    return {
      type: 'fragment',
      key: this.key,
      rect,
      partLabelRenders,
      partRenders,
    };
  }

  private renderParts(pen: Pen): PartRender[] {
    const partCount = this.document.getPartCount(this.key);

    const partLabels = this.renderPartLabels(pen.clone());

    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };

      let width = this.width;
      const partLabel = partLabels?.at(partIndex) ?? null;
      if (width && partLabel) {
        width -= partLabel.rect.w;
      }

      const partRender = new Part(this.config, this.log, this.document, key, pen.position(), width).render();
      partRenders.push(partRender);
      pen.moveBy({ dy: partRender.rect.h });
    }

    return partRenders;
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
  private renderPartLabels(pen: Pen): PartLabelRender[] | null {
    const partCount = this.document.getPartCount(this.key);

    const isFirstSystem = this.key.systemIndex === 0;
    const isFirstMeasure = this.key.measureIndex === 0;
    if (!isFirstSystem || !isFirstMeasure) {
      return null;
    }

    return null;

    // const padding = { right: this.config.PART_LABEL_PADDING_RIGHT };
    // const font = {
    //   color: 'black',
    //   family: this.config.PART_LABEL_FONT_FAMILY,
    //   size: this.config.PART_LABEL_FONT_SIZE,
    // };

    // const keys = this.document.getParts(this.key).map<PartKey>((_, partIndex) => ({ ...this.key, partIndex }));

    // // Right-align the part labels.
    // const labelWidths = keys
    //   .map((key) => {
    //     const text = this.document.getPartLabel(key);
    //     return new Label(this.config, this.log, text, Point.origin(), padding, font);
    //   })
    //   .map((label) => label.rect().w);

    // const maxLabelWidth = util.max(labelWidths);
    // const labelXPositions = labelWidths.map((width) => pen.position().x + (maxLabelWidth - width));
    // const parts = keys.map((key) => new Part(this.config, this.log, this.document, key, Point.origin(), null, null));
    // const partLabelRenders = new Array<Label>();

    // for (let partIndex = 0; partIndex < partCount; partIndex++) {
    //   const key = keys[partIndex];
    //   const text = this.document.getPartLabel(key);
    //   const part = parts[partIndex];
    //   const x = labelXPositions[partIndex];
    //   const h = 100; // TODO
    //   const y = pen.position().y + h / 2;

    //   const position = new Point(x, y);

    //   const label = new Label(this.config, this.log, text, position, padding, font);

    //   partLabelRenders.push(label);
    //   pen.moveBy({ dy: part.rect.h });
    // }

    // return partLabelRenders;
  }
}
