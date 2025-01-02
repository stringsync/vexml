import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey } from './types';
import { Point, Rect } from '@/spatial';
import { Part, PartRender } from './part';
import { Pen } from './pen';
import { PartLabelGroup, PartLabelGroupRender } from './partlabelgroup';
import { Ensemble } from './ensemble';

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

    const ensemble = new Ensemble(this.config, this.log, this.document, this.key, pen.position(), this.width);

    const partLabelGroupRender = this.renderPartLabelGroup(pen, ensemble);

    let width = this.width;
    if (partLabelGroupRender && width) {
      width -= partLabelGroupRender.rect.w;
    }

    const partRenders = this.renderParts(pen, ensemble, width);

    const rects = partRenders.map((part) => part.rect);
    if (partLabelGroupRender) {
      rects.push(partLabelGroupRender.rect);
    }
    const rect = Rect.merge(rects);

    const staveWidth = partRenders
      .flatMap((p) => p.staveRenders)
      .map((s) => s.rect.w)
      .at(0);
    if (staveWidth) {
      ensemble.format(staveWidth);
    } else {
      this.log.warn('could not determine stave width, skipping formatting', { ...this.key });
    }

    return {
      type: 'fragment',
      key: this.key,
      rect,
      partLabelGroupRender,
      partRenders,
    };
  }

  private renderPartLabelGroup(pen: Pen, ensemble: Ensemble): PartLabelGroupRender | null {
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    if (!isFirstSystem || !isFirstMeasure) {
      return null;
    }

    const partLabelGroup = new PartLabelGroup(this.config, this.log, this.document, this.key, pen.position(), ensemble);
    const partLabelGroupRender = partLabelGroup.render();

    pen.moveBy({ dx: partLabelGroupRender.rect.w });

    return partLabelGroupRender;
  }

  private renderParts(pen: Pen, ensemble: Ensemble, width: number | null): PartRender[] {
    const partCount = this.document.getPartCount(this.key);

    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, key, pen.position(), width, ensemble).render();
      partRenders.push(partRender);
      pen.moveBy({ dy: partRender.rect.h });
    }

    return partRenders;
  }
}
