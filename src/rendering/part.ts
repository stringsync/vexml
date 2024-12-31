import * as util from '@/util';
import { PartKey, Renderable, RenderLayer, StaveKey } from './types';
import { RenderContext } from 'vexflow';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { PartLabel } from './partlabel';
import { Pen } from './pen';
import { Stave } from './stave';

export class Part implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point,
    private label: PartLabel | null,
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

    const pen = new Pen(this.position);

    if (this.label) {
      children.push(this.label);
      pen.moveBy({ dx: this.label.rect().w });
    }

    for (const stave of this.getStaves(pen.clone())) {
      children.push(stave);
    }

    return children;
  }

  getStaveHeight(): number {
    const pen = new Pen(this.position);

    const rects = this.getStaves(pen).map((stave) => stave.childlessRect());

    if (rects.length === 0) {
      return 0;
    }

    return rects.at(-1)!.getMaxY() - rects.at(0)!.getMinY();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext): void {}

  private getStaves(pen: Pen): Stave[] {
    const staveCount = this.document.getStaveCount(this.key);

    const staves = new Array<Stave>();

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const stave = new Stave(this.config, this.log, this.document, key, pen.position(), this.width);
      staves.push(stave);
      pen.moveBy({ dy: stave.rect().h });
    }

    return staves;
  }
}
