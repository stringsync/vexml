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

  vexflowBrace: vexflow.StaveConnector | null;
};

export class Part {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point,
    private multiRestCount: number
  ) {}

  render(): PartRender {
    const staveRenders = this.renderStaves();
    const vexflowBrace = this.renderVexflowBrace(staveRenders);

    return {
      type: 'part',
      key: this.key,
      rect: Rect.empty(), // placeholder
      staveRenders,
      vexflowBrace,
    };
  }

  private renderStaves(): StaveRender[] {
    const pen = new Pen(this.position);

    const staveRenders = new Array<StaveRender>();
    const staveCount = this.document.getStaveCount(this.key);

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const staveRender = new Stave(
        this.config,
        this.log,
        this.document,
        key,
        pen.position(),
        this.multiRestCount
      ).render();
      staveRenders.push(staveRender);

      // TODO: Check <stave-layouts> first, which has a part+stave scoped margin.
      pen.moveBy({ dy: this.config.DEFAULT_STAVE_MARGIN_BOTTOM + staveRender.vexflowStave.getHeight() });
    }

    return staveRenders;
  }

  private renderVexflowBrace(staveRenders: StaveRender[]): vexflow.StaveConnector | null {
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstMeasureEntry = this.document.isFirstMeasureEntry(this.key);
    if (isFirstMeasure && isFirstMeasureEntry && staveRenders.length > 1) {
      const firstVexflowStave = staveRenders.at(0)!.vexflowStave;
      const lastVexflowStave = staveRenders.at(-1)!.vexflowStave;
      return new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('brace');
    }
    return null;
  }
}
