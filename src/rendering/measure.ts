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

    const rect = Rect.merge(fragmentRenders.map((entry) => entry.rect));

    return {
      type: 'measure',
      key: this.key,
      rect,
      fragmentRenders,
      multiRestCount,
      absoluteIndex,
    };
  }

  private renderFragments(pen: Pen): FragmentRender[] {
    const fragmentWidths = this.getFragmentWidths();

    return this.document.getFragments(this.key).map((entry, fragmentIndex) => {
      const key: FragmentKey = { ...this.key, fragmentIndex: fragmentIndex };
      const width = fragmentWidths?.at(fragmentIndex) ?? null;
      return new Fragment(this.config, this.log, this.document, key, pen.position(), width).render();
    });
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
