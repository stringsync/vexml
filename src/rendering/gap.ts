import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, RenderLayer } from './types';
import { Point } from '@/spatial';
import { Renderable } from './renderable';

export class Gap extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point
  ) {
    super();
  }

  @util.memoize()
  children(): Renderable[] {
    return [];
  }
}
