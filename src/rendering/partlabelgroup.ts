import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, PartKey, PartLabelKey } from './types';
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

    const partLabelRenders = this.renderPartLabels(pen.position());

    const rect = Rect.merge(partLabelRenders.map((partLabel) => partLabel.rect));

    return {
      type: 'partlabelgroup',
      rect,
      partLabelRenders,
    };
  }

  private renderPartLabels(position: Point): PartLabelRender[] {
    const partLabelRenders = new Array<PartLabelRender>();
    const partLabelPositions = this.getPartLabelPositions(position);
    const partCount = this.document.getPartCount(this.key);

    const padding = { right: this.config.PART_LABEL_PADDING_RIGHT };
    const font = {
      color: 'black',
      family: this.config.PART_LABEL_FONT_FAMILY,
      size: this.config.PART_LABEL_FONT_SIZE,
    };

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

  private getPartLabelPositions(position: Point): Point[] {
    const positions = new Array<Point>();
    const partCount = this.document.getPartCount(this.key);
    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partKey: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, partKey, position, null).render();
      partRenders.push(partRender);
    }

    const partWidths = partRenders.map((part) => part.rect.w);
    const maxPartWidth = Math.max(0, ...partWidths);
    const staveTops = partRenders.map((part) => part.staveRenders.at(0)?.vexflowStave.getTopLineTopY() ?? 0);
    const staveBottoms = partRenders.map((part) => part.staveRenders.at(-1)?.vexflowStave.getBottomLineBottomY() ?? 0);

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const partWidth = partWidths[partIndex];
      const staveTop = staveTops[partIndex];
      const staveBottom = staveBottoms[partIndex];

      let offsetX: number = 0;
      if (this.config.PART_LABEL_ALIGNMENT === 'right') {
        offsetX = maxPartWidth - partWidth;
      }

      const x = this.position.x + offsetX;
      const y = (staveTop + staveBottom) / 2;

      positions.push(new Point(x, y));
    }

    return positions;
  }
}
