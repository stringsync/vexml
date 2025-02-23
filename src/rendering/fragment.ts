import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Document } from './document';
import { FragmentKey, FragmentRender, PartKey, PartLabelGroupRender, PartRender } from './types';
import { Point, Rect } from '@/spatial';
import { Part } from './part';
import { Pen } from './pen';
import { PartLabelGroup } from './partlabelgroup';
import { Budget } from './budget';
import { Ensemble } from './ensemble';
import { GapOverlay } from './gapoverlay';

const BARLINE_PADDING_RIGHT = 6;
const MEASURE_NUMBER_PADDING_LEFT = 6;
const BRACE_CONNECTOR_PADDING_LEFT = 8;

export class Fragment {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: FragmentKey,
    private position: Point,
    private width: number | null
  ) {}

  render(): FragmentRender {
    const pen = new Pen(this.position);

    let widthBudget: Budget;
    if (this.width === null) {
      const minWidth = this.document.getFragment(this.key).minWidth;
      if (minWidth) {
        widthBudget = new Budget(minWidth);
      } else {
        widthBudget = Budget.unlimited();
      }
    } else {
      widthBudget = new Budget(this.width);
    }

    // We don't know the y positions of the staves yet, so we don't know the y positions of the labels yet. For now,we
    // just account for the width it steals from the parts.
    const prePartLabelGroupPosition = pen.position();
    this.accountForPartLabelGroupWidth(pen, widthBudget);
    const postPartLabelGroupPosition = pen.position();

    // Drawing some vexflow elements is not idempotent. However, this is needed to determine the rects of the components
    // in vexml. We render the children twice. The first render will be used to get the rect measurements, then thrown
    // away. The second render will actually be used to draw the elements.
    // See https://github.com/vexflow/vexflow/issues/254
    pen.save();
    const partRenders = this.renderParts(pen);
    pen.restore();
    const throwawayPartRenders = this.renderParts(pen);

    const fragmentRender: FragmentRender = {
      type: 'fragment',
      key: this.key,
      rectSrc: 'none',
      rect: Rect.empty(), // placeholder
      excessHeight: 0, // placeholder
      partLabelGroupRender: null, // placeholder
      vexflowStaveConnectors: [], // placeholder
      partRenders,
      gapOverlay: null, // placeholder
    };
    const throwawayFragmentRender: FragmentRender = {
      type: 'fragment',
      key: this.key,
      rectSrc: 'none',
      rect: Rect.empty(), // placeholder
      excessHeight: 0, // placeholder
      partLabelGroupRender: null, // placeholder
      vexflowStaveConnectors: [], // placeholder
      partRenders: throwawayPartRenders,
      gapOverlay: null, // placeholder
    };

    let ensembleWidth: number | null;
    if (widthBudget.isUnlimited() || widthBudget.remaining() <= 0) {
      ensembleWidth = null;
    } else {
      ensembleWidth = widthBudget.remaining();
    }

    const paddingLeft = pen.x - postPartLabelGroupPosition.x;
    let paddingRight = 0;

    const isLastMeasure = this.document.isLastMeasure(this.key);
    const isLastFragment = this.document.isLastFragment(this.key);
    if (isLastMeasure && isLastFragment) {
      paddingRight += BARLINE_PADDING_RIGHT;
    }

    const ensemble = new Ensemble(this.config, this.log, this.document, this.key);

    // First format is to populate the cache.
    ensemble.format(throwawayFragmentRender, {
      x: postPartLabelGroupPosition.x,
      width: ensembleWidth,
      paddingLeft,
      paddingRight,
      cache: null,
    });

    // Second format is to format the vexflow components, but don't draw them.
    ensemble.format(fragmentRender, {
      x: postPartLabelGroupPosition.x,
      width: ensembleWidth,
      paddingLeft,
      paddingRight,
      cache: throwawayFragmentRender,
    });

    const vexflowStaveConnectors = this.renderVexflowStaveConnectors(partRenders);
    fragmentRender.vexflowStaveConnectors = vexflowStaveConnectors;

    // After formatting, we can trust the y positions of the staves. Now we can render the part labels.
    const partLabelGroupRender = this.renderPartLabelGroup(prePartLabelGroupPosition, partRenders);

    if (partLabelGroupRender) {
      fragmentRender.partLabelGroupRender = partLabelGroupRender;
      fragmentRender.rect = Rect.merge([fragmentRender.rect, partLabelGroupRender.rect]);
    }

    const fragment = this.document.getFragment(this.key);
    if (fragment.kind === 'nonmusical') {
      fragmentRender.gapOverlay = new GapOverlay(this.config, this.log, fragment.label, fragmentRender, fragment.style);
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
    const isFirstFragment = this.document.isFirstFragment(this.key);
    if (!isFirstSystem || !isFirstMeasure || !isFirstFragment) {
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
    const isFirstFragment = this.document.isFirstFragment(this.key);
    if (isFirstMeasure && isFirstFragment) {
      pen.moveBy({ dx: MEASURE_NUMBER_PADDING_LEFT });
    }
    if (isFirstMeasure && isFirstFragment && this.hasBraceConnector()) {
      pen.moveBy({ dx: BRACE_CONNECTOR_PADDING_LEFT });
    }

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const key: PartKey = { ...this.key, partIndex };
      const partRender = new Part(this.config, this.log, this.document, key, pen.position()).render();
      partRenders.push(partRender);

      const lastVexflowStave = partRender.staveRenders.at(-1)?.vexflowStave;
      if (lastVexflowStave) {
        pen.moveTo({ x: pen.x, y: lastVexflowStave.getBottomLineBottomY() });
      }

      pen.moveBy({ dy: this.config.PART_MARGIN_BOTTOM });
    }

    return partRenders;
  }

  private renderVexflowStaveConnectors(partRenders: PartRender[]): vexflow.StaveConnector[] {
    const vexflowStaveConnectors = new Array<vexflow.StaveConnector>();

    const staves = partRenders.flatMap((p) => p.staveRenders).map((s) => s.vexflowStave);

    if (staves.length > 1) {
      const firstVexflowStave = staves.at(0)!;
      const lastVexflowStave = staves.at(-1)!;

      const isFirstFragment = this.document.isFirstFragment(this.key);
      if (isFirstFragment) {
        vexflowStaveConnectors.push(
          new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('singleLeft')
        );
      }

      const isLastFragment = this.document.isLastFragment(this.key);
      const endBarlineStyle = this.document.getMeasure(this.key).endBarlineStyle;
      if (isLastFragment) {
        if (endBarlineStyle === 'double') {
          vexflowStaveConnectors.push(
            new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('thinDouble')
          );
        } else if (endBarlineStyle === 'end' || endBarlineStyle === 'repeatend') {
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
