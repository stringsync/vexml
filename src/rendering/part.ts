import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { PartKey } from './types';
import { Stave } from './stave';

export class Part {
  constructor(private config: Config, private log: Logger, private document: Document, private key: PartKey) {}

  getStaves(): Stave[] {
    return this.document
      .getStaves(this.key)
      .map((_, staveIndex) => new Stave(this.config, this.log, this.document, { ...this.key, staveIndex }));
  }

  render(ctx: vexflow.RenderContext, x: number, y: number): elements.Part {
    const staves = this.getStaves().map((stave) => stave.render(ctx, x, y));

    return new elements.Part(ctx, staves);
  }
}
