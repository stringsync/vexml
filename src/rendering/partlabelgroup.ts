import { Rect } from '@/spatial';
import { PartLabelKey } from './types';
import { Label } from './label';

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
    return [];
  }
}
