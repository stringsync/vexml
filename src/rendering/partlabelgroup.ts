import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, Padding, PartLabelKey } from './types';
import { Document } from './document';
import { Label } from './label';
import { Config } from './config';
import { Logger } from '@/debug';
import { PartRender } from './part';
import { TextMeasurer } from './textmeasurer';

export type PartLabelGroupRender = {
  type: 'partlabelgroup';
  rect: Rect;
  partLabelRenders: PartLabelRender[];
};

export type PartLabelRender = {
  type: 'partLabel';
  key: PartLabelKey;
  rect: Rect;
  label: Label;
};

export class PartLabelGroup {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private partRenders: PartRender[] | null
  ) {}

  render(): PartLabelGroupRender {
    const partLabelRenders = this.renderPartLabels();

    const rect = Rect.merge(partLabelRenders.map((partLabel) => partLabel.rect));

    return {
      type: 'partlabelgroup',
      rect,
      partLabelRenders,
    };
  }

  private renderPartLabels(): PartLabelRender[] {
    const partLabelRenders = new Array<PartLabelRender>();
    const partCount = this.document.getPartCount(this.key);

    const positions = this.getPartLabelPositions();
    const padding = this.getPartLabelPadding();
    const font = this.getPartLabelFont();

    console.log(positions);

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartLabelKey = { ...this.key, partIndex };
      const text = this.document.getPartLabel(key);
      const position = positions.at(partIndex) ?? this.position;
      const label = Label.singleLine(this.config, this.log, text, position, padding, font);
      partLabelRenders.push({ type: 'partLabel', key, rect: label.rect, label });
    }

    return partLabelRenders;
  }

  private getPartLabelPositions(): Point[] {
    const positions = new Array<Point>();
    const partCount = this.document.getPartCount(this.key);

    const textMeasurer = new TextMeasurer(this.getPartLabelFont());

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partLabel = this.document.getPartLabel({ ...this.key, partIndex });
      const staveRenders = this.partRenders?.at(partIndex)?.staveRenders;
      const staveCount = staveRenders?.length ?? 0;

      if (staveCount > 0) {
        const top = staveRenders!.at(0)!.intrinsicRect.getMinY();
        const bottom = staveRenders!.at(-1)!.intrinsicRect.getMaxY();
        const middle = (top + bottom) / 2;
        const height = textMeasurer.measure(partLabel).approximateHeight;
        positions.push(new Point(this.position.x, middle + height / 2));
      } else {
        // If there's no part render to use, just use the position of the part label group. We'll correct it later.
        positions.push(this.position);
      }
    }

    return positions;
  }

  private getPartLabelPadding(): Padding {
    return { right: this.config.PART_LABEL_PADDING_RIGHT };
  }

  private getPartLabelFont() {
    return {
      color: 'black',
      family: this.config.PART_LABEL_FONT_FAMILY,
      size: this.config.PART_LABEL_FONT_SIZE,
    };
  }
}
