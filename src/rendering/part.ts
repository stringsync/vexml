import * as vexflow from 'vexflow';
import { PartKey, PartRender, StaveKey, StaveRender } from './types';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Stave } from './stave';
import { Pen } from './pen';

export class Part {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point
  ) {}

  render(): PartRender {
    const pen = new Pen(this.position);

    const staveRenders = this.renderStaves(pen);
    const vexflowBrace = this.renderVexflowBrace(staveRenders);

    return {
      type: 'part',
      key: this.key,
      rect: Rect.empty(), // placeholder
      staveRenders,
      vexflowBrace,
    };
  }

  private renderStaves(pen: Pen): StaveRender[] {
    const staveRenders = new Array<StaveRender>();
    const staveCount = this.document.getStaveCount(this.key);

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const staveRender = new Stave(this.config, this.log, this.document, key, pen.position()).render();
      staveRenders.push(staveRender);

      // TODO: Check <stave-layouts> first, which has a part+stave scoped margin.
      pen.moveBy({ dy: this.config.DEFAULT_STAVE_MARGIN_BOTTOM + staveRender.vexflowStave.getHeight() });
    }

    return staveRenders;
  }

  private renderVexflowBrace(staveRenders: StaveRender[]): vexflow.StaveConnector | null {
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isFirstFragment = this.document.isFirstFragment(this.key);
    if (isFirstMeasure && isFirstFragment && staveRenders.length > 1) {
      const firstVexflowStave = staveRenders.at(0)!.vexflowStave;
      const lastVexflowStave = staveRenders.at(-1)!.vexflowStave;
      return new vexflow.StaveConnector(firstVexflowStave, lastVexflowStave).setType('brace');
    }
    return null;
  }
}
