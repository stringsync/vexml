import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, Renderable, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';

export class Fragment implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  layer(): RenderLayer {
    return 'any';
  }

  children(): Renderable[] {
    return [];
  }

  render(): void {}
}
