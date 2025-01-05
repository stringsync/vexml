import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey } from './types';
import { Point, Rect } from '@/spatial';
import { Part, PartRender } from './part';
import { Pen } from './pen';
import { PartLabelGroup, PartLabelGroupRender } from './partlabelgroup';
import { Ensemble } from './ensemble';
import { Budget } from './budget';

export type FragmentRender = {
  type: 'fragment';
  key: MeasureEntryKey;
  rect: Rect;
  excessHeight: number;
  partLabelGroupRender: PartLabelGroupRender | null;
  vexflowStaveConnectors: vexflow.StaveConnector[];
  partRenders: PartRender[];
};

export class Fragment {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null,
    private multiRestCount: number
  ) {}

  render(): FragmentRender {
    const pen = new Pen(this.position);

    let widthBudget: Budget;
    if (this.width === null) {
      widthBudget = Budget.unlimited();
    } else {
      widthBudget = new Budget(this.width);
    }

    const partLabelGroupRender = this.renderPartLabelGroup(pen, widthBudget);

    const ensembleWidth = widthBudget.isUnlimited() ? null : widthBudget.getRemaining();
    const ensemble = new Ensemble(
      this.config,
      this.log,
      this.document,
      this.key,
      pen.position(),
      ensembleWidth,
      this.multiRestCount
    );
    const ensembleMeasureEntry = ensemble.getMeasureEntry();
    const excessHeight = ensembleMeasureEntry.excessHeight;
    const vexflowStaveConnectors = ensembleMeasureEntry.vexflowStaveConnectors;

    const partRenders = this.renderParts(ensemble);

    const rects = [ensemble.getMeasureEntry().rect];
    if (partLabelGroupRender) {
      rects.push(partLabelGroupRender.rect);
    }
    const rect = Rect.merge(rects);

    return {
      type: 'fragment',
      key: this.key,
      rect,
      excessHeight,
      partLabelGroupRender,
      vexflowStaveConnectors,
      partRenders,
    };
  }

  private renderPartLabelGroup(pen: Pen, widthBudget: Budget): PartLabelGroupRender | null {
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    if (!isFirstSystem || !isFirstMeasure) {
      return null;
    }

    // There's a circular dependency here: PartLabelGroup needs an Ensemble to render, and Ensemble needs to know
    // PartLabelGroup's width to set the vertical positions correctly. We create this temporary ensemble to render the
    // PartLabelGroup, and then throw it away. We can create a new one at the correct position later.
    const ensemble = new Ensemble(
      this.config,
      this.log,
      this.document,
      this.key,
      pen.position(),
      this.width,
      this.multiRestCount
    );

    const partLabelGroup = new PartLabelGroup(this.config, this.log, this.document, this.key, pen.position(), ensemble);
    const partLabelGroupRender = partLabelGroup.render();

    pen.moveBy({ dx: partLabelGroupRender.rect.w });
    widthBudget.spend(partLabelGroupRender.rect.w);

    return partLabelGroupRender;
  }

  private renderParts(ensemble: Ensemble): PartRender[] {
    const partCount = this.document.getPartCount(this.key);

    const partRenders = new Array<PartRender>();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, key, ensemble).render();
      partRenders.push(partRender);
    }

    return partRenders;
  }
}
