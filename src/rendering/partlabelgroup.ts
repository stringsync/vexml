import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, Padding, PartLabelKey } from './types';
import { Document } from './document';
import { Label } from './label';
import { Config } from './config';
import { Logger } from '@/debug';

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

    const padding = this.getPartLabelPadding();
    const font = this.getPartLabelFont();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartLabelKey = { ...this.key, partIndex };
      const text = this.document.getPartLabel(key);
      const label = Label.singleLine(this.config, this.log, text, this.position, padding, font);
      partLabelRenders.push({ type: 'partLabel', key, rect: label.rect, label });
    }

    return partLabelRenders;
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
