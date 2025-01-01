import * as vexflow from 'vexflow';
import { PartKey, StaveKey } from './types';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Stave, StaveRender } from './stave';
import { Pen } from './pen';

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

  /**
   * Returns the minimum required width to render this part. All staves in a part must be the same width, so we pick the
   * largest one.
   */
  getMinRequiredWidths(): [minRequiredStaveWidth: number, minRequiredNonStaveWidth: number] {
    const staveCount = this.document.getStaveCount(this.key);

    let minRequiredStaveWidth = 0;
    const minRequiredNonStaveWidth = 0;

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const stave = new Stave(this.config, this.log, this.document, key, this.position, this.width);
      minRequiredStaveWidth = Math.max(minRequiredStaveWidth, stave.getMinRequiredWidth());
    }

    return [minRequiredStaveWidth, minRequiredNonStaveWidth];
  }

  render(): PartRender {
    const pen = new Pen(this.position);

    const staveRenders = this.renderStaves(pen);
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

  private renderStaves(pen: Pen): StaveRender[] {
    const staveRenders = new Array<StaveRender>();
    const staveCount = this.document.getStaveCount(this.key);

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const staveRender = new Stave(this.config, this.log, this.document, key, pen.position(), this.width).render();
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

    const isLastMeasure = this.key.measureIndex === this.document.getMeasureCount(this.key) - 1;
    const isLastMeasureEntry = this.key.measureEntryIndex === this.document.getMeasureEntryCount(this.key) - 1;

    const topStave = staveRenders.at(0)!;
    const bottomStave = staveRenders.at(-1)!;

    vexflowStaveConnectors.push(
      new vexflow.StaveConnector(topStave.vexflowStave, bottomStave.vexflowStave).setType('singleLeft')
    );

    if (isLastMeasure && isLastMeasureEntry) {
      vexflowStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflowStave, bottomStave.vexflowStave).setType('singleRight')
      );
    }

    return vexflowStaveConnectors;
  }
}
