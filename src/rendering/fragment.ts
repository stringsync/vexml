import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Part } from './part';
import { MeasureEntryKey } from './types';

export class Fragment {
  constructor(private config: Config, private log: Logger, private document: Document, private key: MeasureEntryKey) {}

  getParts(): Part[] {
    return this.document
      .getParts(this.key)
      .map((_, partIndex) => new Part(this.config, this.log, this.document, { ...this.key, partIndex }));
  }

  render(ctx: vexflow.RenderContext): elements.Fragment {
    return new elements.Fragment(ctx);
  }
}
