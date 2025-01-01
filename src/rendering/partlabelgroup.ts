import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, Padding, PartKey, PartLabelKey } from './types';
import { Document } from './document';
import { Label } from './label';
import { Config } from './config';
import { Logger } from '@/debug';
import { Part, PartRender } from './part';
import { Pen } from './pen';

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
    private position: Point
  ) {}

  render(): PartLabelGroupRender {
    const pen = new Pen(this.position);

    const partLabelRenders = this.renderPartLabels(pen);

    const rect = Rect.merge(partLabelRenders.map((partLabel) => partLabel.rect));

    return {
      type: 'partlabelgroup',
      rect,
      partLabelRenders,
    };
  }

  private renderPartLabels(pen: Pen): PartLabelRender[] {
    const partLabelRenders = new Array<PartLabelRender>();
    const partLabelPositions = this.getPartLabelPositions(pen);
    const partCount = this.document.getPartCount(this.key);

    const padding = this.getPartLabelPadding();
    const font = this.getPartLabelFont();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartLabelKey = { ...this.key, partIndex };
      const partLabelPosition = partLabelPositions[partIndex];
      const text = this.document.getPartLabel(partKey);
      const label = new Label(this.config, this.log, text, partLabelPosition, padding, font);
      const rect = label.rect();
      partLabelRenders.push({ type: 'partLabel', key: partKey, rect, label });
    }

    return partLabelRenders;
  }

  private getPartLabelPositions(pen: Pen): Point[] {
    const partLabelPositions = new Array<Point>();
    const partCount = this.document.getPartCount(this.key);
    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, partKey, pen.position(), null).render();
      partRenders.push(partRender);
      pen.moveBy({ dy: partRender.rect.h });
    }

    // Part widths depend on each other through this metric and the alignment config.
    const maxPartWidth = Math.max(0, ...partRenders.map((part) => part.rect.w));

    const padding = this.getPartLabelPadding();
    const font = this.getPartLabelFont();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartLabelKey = { ...this.key, partIndex };

      const partRender = partRenders[partIndex];
      const partWidth = partRender.rect.w;
      const staveTop = partRender.staveRenders.at(0)?.intrisicRect.getMinY() ?? 0;
      const staveBottom = partRender.staveRenders.at(-1)?.intrisicRect.getMaxY() ?? 0;

      let offsetX: number = 0;
      if (this.config.PART_LABEL_ALIGNMENT === 'right') {
        offsetX = maxPartWidth - partWidth;
      }

      const text = this.document.getPartLabel(key);
      const label = new Label(this.config, this.log, text, Point.origin(), padding, font);
      const offsetY = label.rect().h / 2;

      const x = this.position.x + offsetX;
      const y = (staveTop + staveBottom) / 2 + offsetY;

      partLabelPositions.push(new Point(x, y));
    }

    return partLabelPositions;
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
