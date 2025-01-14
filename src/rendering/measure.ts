import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { FragmentKey, FragmentRender, MeasureKey, MeasureRender } from './types';
import { Point, Rect } from '@/spatial';
import { Fragment } from './fragment';
import { Pen } from './pen';

export class Measure {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureKey,
    private position: Point,
    private width: number | null
  ) {}

  render(): MeasureRender {
    const pen = new Pen(this.position);

    const absoluteIndex = this.document.getAbsoluteMeasureIndex(this.key);
    const multiRestCount = this.document.getMeasureMultiRestCount(this.key);
    const fragmentRenders = this.renderFragments(pen);
    const jumps = this.document.getMeasure(this.key).jumps;

    const rect = Rect.merge(fragmentRenders.map((fragment) => fragment.rect));

    return {
      type: 'measure',
      key: this.key,
      rect,
      fragmentRenders,
      multiRestCount,
      absoluteIndex,
      jumps,
    };
  }

  private renderFragments(pen: Pen): FragmentRender[] {
    const fragmentWidths = this.getFragmentWidths();

    const fragmentCount = this.document.getFragmentCount(this.key);

    const fragmentRenders = new Array<FragmentRender>();

    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
      const key: FragmentKey = { ...this.key, fragmentIndex };
      const width = fragmentWidths?.at(fragmentIndex) ?? null;
      const fragmentRender = new Fragment(this.config, this.log, this.document, key, pen.position(), width).render();
      fragmentRenders.push(fragmentRender);
      // If the width is compressed too much, the voices will exceed the stave boundaries. To adhere to the model, we
      // move to the edge of _any_ stave's intrinsic rect.
      const staveRender = fragmentRender.partRenders.flatMap((p) => p.staveRenders).at(0);
      if (staveRender) {
        const upperRight = staveRender.intrinsicRect.upperRight();
        pen.moveTo({ x: upperRight.x, y: pen.y });
      } else {
        // If this happens, the fragment staves may not be aligned. There could be a gap or overlap.
        this.log.warn('found a fragment render without staves, using fragment rect for spacing', key);
        pen.moveBy({ dx: fragmentRender.rect.w });
      }
    }

    return fragmentRenders;
  }

  private getFragmentWidths(): number[] | null {
    if (this.width === null) {
      return null;
    }

    const fragmentCount = this.document.getFragmentCount(this.key);

    const widths = new Array<number>();

    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
      const key: FragmentKey = { ...this.key, fragmentIndex };
      const fragmentRender = new Fragment(this.config, this.log, this.document, key, Point.origin(), null).render();
      widths.push(fragmentRender.rect.w);
    }

    const total = util.sum(widths);

    return widths.map((w) => (w / total) * this.width!);
  }
}
