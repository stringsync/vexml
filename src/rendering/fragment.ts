import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, PartKey, Renderable, RenderContext, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { Part } from './part';

export class Fragment implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  layer(): RenderLayer {
    return 'any';
  }

  @util.memoize()
  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  @util.memoize()
  children(): Renderable[] {
    const children = new Array<Renderable>();

    for (const part of this.getParts()) {
      children.push(part);
    }

    return children;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext): void {}

  getParts(): Part[] {
    return this.document.getParts(this.key).map((_, partIndex) => {
      const partKey: PartKey = { ...this.key, partIndex };
      return new Part(this.config, this.log, this.document, partKey, this.position);
    });
  }
}
