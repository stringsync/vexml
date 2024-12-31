import * as util from '@/util';
import { PartKey, RenderLayer, StaveKey } from './types';
import { Point } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Pen } from './pen';
import { Stave } from './stave';
import { Label } from './label';
import { Renderable } from './renderable';

export class Part extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: PartKey,
    private position: Point,
    private label: Label | null,
    private width: number | null
  ) {
    super();
  }

  @util.memoize()
  children(): Renderable[] {
    const children = new Array<Renderable>();

    const pen = new Pen(this.position);

    if (this.label) {
      children.push(this.label);
      pen.moveBy({ dx: this.label.rect.w });
    }

    for (const stave of this.getDescendantlessStaves(pen.clone())) {
      children.push(stave);
    }

    return children;
  }

  getStaveHeight(): number {
    const pen = new Pen(this.position);

    const rects = this.getDescendantlessStaves(pen).map((stave) => stave.rect);

    if (rects.length === 0) {
      return 0;
    }

    return rects.at(-1)!.getMaxY() - rects.at(0)!.getMinY();
  }

  private getDescendantlessStaves(pen: Pen): Stave[] {
    const staveCount = this.document.getStaveCount(this.key);

    const staves = new Array<Stave>();

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const key: StaveKey = { ...this.key, staveIndex };
      const stave = new Stave(this.config, this.log, this.document, key, pen.position(), this.width, false);
      staves.push(stave);
      pen.moveBy({ dy: stave.rect.h });
    }

    return staves;
  }
}
