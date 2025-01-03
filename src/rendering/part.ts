import * as vexflow from 'vexflow';
import { PartKey, StaveKey } from './types';
import { Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Stave, StaveRender } from './stave';
import { Ensemble } from './ensemble';

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
    private ensemble: Ensemble
  ) {}

  render(): PartRender {
    const ensemblePart = this.ensemble.getPart(this.key);
    const vexflowStaveConnectors = ensemblePart.vexflowStaveConnectors;

    const staveRenders = this.renderStaves();

    const rect = ensemblePart.rect;

    return {
      type: 'part',
      key: this.key,
      rect,
      staveRenders,
      vexflowStaveConnectors,
    };
  }

  private renderStaves(): StaveRender[] {
    const staveRenders = new Array<StaveRender>();
    const staveCount = this.document.getStaveCount(this.key);

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const staveRender = new Stave(this.config, this.log, this.document, key, this.ensemble).render();
      staveRenders.push(staveRender);
    }

    return staveRenders;
  }
}
