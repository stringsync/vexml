import * as vexflow from 'vexflow';
import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey } from './types';

export class Gap {
  constructor(private config: Config, private log: Logger, private document: Document, private key: MeasureEntryKey) {}

  render(ctx: vexflow.RenderContext, x: number, y: number): elements.Gap {
    return new elements.Gap(ctx);
  }
}
