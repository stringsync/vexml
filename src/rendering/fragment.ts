import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey } from './types';
import { Point, Rect } from '@/spatial';
import { Part, PartRender } from './part';
import { Pen } from './pen';
import { PartLabelGroup, PartLabelGroupRender } from './partlabelgroup';
import { Budget } from './budget';
import { Ensemble } from './ensemble';

const MEASURE_NUMBER_PADDING_LEFT = 6;
const BRACE_CONNECTOR_PADDING_LEFT = 8;

export type FragmentRender = {
  type: 'fragment';
  key: MeasureEntryKey;
  rect: Rect;
  excessHeight: number;
  partLabelGroupRender: PartLabelGroupRender | null;
  partRenders: PartRender[];
  vexflowStaveConnectors: vexflow.StaveConnector[];
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

    let widthBudget: Budget;
    if (this.width === null) {
      widthBudget = Budget.unlimited();
    } else {
      widthBudget = new Budget(this.width);
    }

    // We don't know the y positions of the staves yet, so we don't know the y positions of the labels yet. For now,we
    // just account for the width it steals from the parts.
    const prePartLabelGroupPosition = pen.position();
    this.accountForPartLabelGroupWidth(pen, widthBudget);
    const postPartLabelGroupPosition = pen.position();

    const partRenders = this.renderParts(pen);

    const vexflowStaveConnectors = this.renderVexflowStaveConnectors(partRenders);

    const fragmentRender: FragmentRender = {
      type: 'fragment',
      key: this.key,
      rect: Rect.empty(), // placeholder
      excessHeight: 0, // placeholder
      partLabelGroupRender: null, // placeholder
      vexflowStaveConnectors,
      partRenders,
    };

    const multiRestCount = this.document.getMeasureMultiRestCount(this.key);

    const ensembleWidth = widthBudget.isUnlimited() ? null : widthBudget.remaining();
    const ensemble = new Ensemble(
      this.config,
      this.log,
      this.document,
      this.key,
      postPartLabelGroupPosition,
      ensembleWidth,
      multiRestCount,
      fragmentRender
    );
    ensemble.format(pen);

    // After formatting, we can trust the y positions of the staves. Now we can render the part labels.
    const partLabelGroupRender = this.renderPartLabelGroup(prePartLabelGroupPosition, partRenders);

    if (partLabelGroupRender) {
      fragmentRender.partLabelGroupRender = partLabelGroupRender;
      fragmentRender.rect = Rect.merge([fragmentRender.rect, partLabelGroupRender.rect]);
    }

    return fragmentRender;
  }

  private accountForPartLabelGroupWidth(pen: Pen, widthBudget: Budget): void {
    if (!this.hasPartLabels()) {
      return;
    }
    const partLabelGroup = new PartLabelGroup(this.config, this.log, this.document, this.key, pen.position(), null);
    const partLabelGroupRender = partLabelGroup.render();

    pen.moveBy({ dx: partLabelGroupRender.rect.w });
    widthBudget.spend(partLabelGroupRender.rect.w);
  }

  private renderPartLabelGroup(position: Point, partRenders: PartRender[]): PartLabelGroupRender | null {
    if (!this.hasPartLabels()) {
      return null;
    }
    const partLabelGroup = new PartLabelGroup(this.config, this.log, this.document, this.key, position, partRenders);
    const partLabelGroupRender = partLabelGroup.render();

    return partLabelGroupRender;
  }

  private hasPartLabels(): boolean {
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    if (!isFirstSystem || !isFirstMeasure) {
      return false;
    }

    const partCount = this.document.getPartCount(this.key);

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partLabel = this.document.getPartLabel(key);
      if (partLabel) {
        return true;
      }
    }

    return false;
  }

  private renderParts(pen: Pen): PartRender[] {
    const partRenders = new Array<PartRender>();
    const partCount = this.document.getPartCount(this.key);

    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstMeasureEntry = this.document.isFirstMeasureEntry(this.key);
    if (isFirstMeasure) {
      pen.moveBy({ dx: MEASURE_NUMBER_PADDING_LEFT });
    }
    if (isFirstMeasure && isFirstMeasureEntry && this.hasBraceConnector()) {
      pen.moveBy({ dx: BRACE_CONNECTOR_PADDING_LEFT });
    }

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, key, pen.position()).render();
      partRenders.push(partRender);
    }

    return partRenders;
  }

  private renderVexflowStaveConnectors(partRenders: PartRender[]): vexflow.StaveConnector[] {
    const vexflowStaveConnectors = new Array<vexflow.StaveConnector>();

    const staves = partRenders.flatMap((p) => p.staveRenders).map((s) => s.vexflowStave);

    if (staves.length > 1) {
      const firstVexflowStave = staves.at(0)!;
      const lastVexflowStave = staves.at(-1)!;

      const isFirstMeasureEntry = this.document.isFirstMeasureEntry(this.key);
      if (isFirstMeasureEntry) {
        vexflowStaveConnectors.push(
          new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleLeft')
        );
      }

      const isLastSystem = this.document.isLastSystem(this.key);
      const isLastMeasure = this.document.isLastMeasure(this.key);
      const isLastMeasureEntry = this.document.isLastMeasureEntry(this.key);
      if (isLastMeasureEntry) {
        if (isLastSystem && isLastMeasure) {
          vexflowStaveConnectors.push(
            new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('boldDoubleRight')
          );
        } else {
          vexflowStaveConnectors.push(
            new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleRight')
          );
        }
      }
    }

    return vexflowStaveConnectors;
  }

  private hasBraceConnector(): boolean {
    const partCount = this.document.getPartCount(this.key);
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const staveCount = this.document.getStaveCount(key);
      if (staveCount > 1) {
        return true;
      }
    }
    return false;
  }
}
