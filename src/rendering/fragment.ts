import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey } from './types';
import { Point, Rect } from '@/spatial';
import { Part, PartRender } from './part';
import { Pen } from './pen';
import { PartLabelGroupRender } from './partlabelgroup';

export type FragmentRender = {
  type: 'fragment';
  key: MeasureEntryKey;
  rect: Rect;
  partLabelGroupRender: PartLabelGroupRender | null;
  partRenders: PartRender[];
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

    const partRenders = this.renderParts(pen);

    const rect = Rect.merge(partRenders.map((part) => part.rect));

    return {
      type: 'fragment',
      key: this.key,
      rect,
      partLabelGroupRender: null,
      partRenders,
    };
  }

  private renderParts(pen: Pen): PartRender[] {
    const partCount = this.document.getPartCount(this.key);

    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };

      const partRender = new Part(this.config, this.log, this.document, key, pen.position(), this.width).render();
      partRenders.push(partRender);
      pen.moveBy({ dy: partRender.rect.h });
    }

    return partRenders;
  }
}
