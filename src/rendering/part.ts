import * as vexflow from 'vexflow';
import { PartKey, StaveKey } from './types';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Stave, StaveRender } from './stave';
import { Pen } from './pen';

const BRACE_STAVE_CONNECTOR_WIDTH = 16;

export type PartRender = {
  type: 'part';
  key: PartKey;
  rect: Rect;
  staveRenders: StaveRender[];
  vexflowStaveConnectors: vexflow.StaveConnector[];
};

export class Part {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point,
    private width: number | null
  ) {}

  render(): PartRender {
    const pen = new Pen(this.position);

    let staveWidth = this.width;
    if (staveWidth && this.hasBraceConnector()) {
      pen.moveBy({ dx: BRACE_STAVE_CONNECTOR_WIDTH });
      staveWidth -= BRACE_STAVE_CONNECTOR_WIDTH;
    }

    const staveRenders = this.renderStaves(pen, staveWidth);

    const vexflowStaveConnectors = this.renderVexflowStaveConnectors(staveRenders);

    const rect = Rect.merge(staveRenders.map((staveRender) => staveRender.rect));

    return {
      type: 'part',
      key: this.key,
      rect,
      staveRenders,
      vexflowStaveConnectors,
    };
  }

  private renderStaves(pen: Pen, staveWidth: number | null): StaveRender[] {
    const staveRenders = new Array<StaveRender>();
    const staveCount = this.document.getStaveCount(this.key);

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const staveRender = new Stave(this.config, this.log, this.document, key, pen.position(), staveWidth).render();
      staveRenders.push(staveRender);
      pen.moveBy({ dy: staveRender.rect.h });
    }

    return staveRenders;
  }

  private renderVexflowStaveConnectors(staveRenders: StaveRender[]): vexflow.StaveConnector[] {
    const vexflowStaveConnectors = new Array<vexflow.StaveConnector>();

    if (staveRenders.length <= 1) {
      return vexflowStaveConnectors;
    }

    const topStave = staveRenders.at(0)!;
    const bottomStave = staveRenders.at(-1)!;

    if (this.hasBraceConnector()) {
      vexflowStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflowStave, bottomStave.vexflowStave).setType('brace')
      );
    }

    vexflowStaveConnectors.push(
      new vexflow.StaveConnector(topStave.vexflowStave, bottomStave.vexflowStave).setType('singleLeft')
    );

    const isLastMeasure = this.key.measureIndex === this.document.getMeasureCount(this.key) - 1;
    const isLastMeasureEntry = this.key.measureEntryIndex === this.document.getMeasureEntryCount(this.key) - 1;
    if (isLastMeasure && isLastMeasureEntry) {
      vexflowStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflowStave, bottomStave.vexflowStave).setType('singleRight')
      );
    }

    return vexflowStaveConnectors;
  }

  private hasBraceConnector(): boolean {
    return (
      this.document.getStaveCount(this.key) > 1 &&
      this.document.isFirstMeasure(this.key) &&
      this.document.isFirstMeasureEntry(this.key)
    );
  }
}
