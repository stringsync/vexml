import * as util from '@/util';
import { PartKey, Renderable, RenderLayer } from './types';
import { RenderContext } from 'vexflow';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { PartLabel } from './partlabel';

export class Part implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point
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
    return [this.getPartLabel()];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext): void {}

  private getPartLabel(): PartLabel {
    return new PartLabel(this.config, this.log, this.document, this.key, this.position);
  }
}
