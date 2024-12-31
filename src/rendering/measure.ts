import * as util from '@/util';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, MeasureKey, RenderLayer } from './types';
import { Point } from '@/spatial';
import { Fragment } from './fragment';
import { Gap } from './gap';
import { Pen } from './pen';
import { Renderable } from './renderable';

export class Measure extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureKey,
    private position: Point,
    private width: number | null
  ) {
    super();
  }

  layer(): RenderLayer {
    return 'any';
  }

  @util.memoize()
  children(): Renderable[] {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const pen = new Pen(this.position);

    const children = new Array<Renderable>();

    for (const measureEntry of this.getMeasureEntries(pen)) {
      children.push(measureEntry);
    }

    performanceMonitor.check(stopwatch.lap(), this.key);

    return children;
  }

  render(): void {}

  private getMeasureEntries(pen: Pen): Array<Fragment | Gap> {
    const measureEntryWidths = this.getMeasureEntryWidths();

    return this.document.getMeasureEntries(this.key).map((entry, measureEntryIndex) => {
      const key: MeasureEntryKey = { ...this.key, measureEntryIndex };
      const width = measureEntryWidths?.at(measureEntryIndex) ?? null;
      switch (entry.type) {
        case 'fragment':
          return new Fragment(this.config, this.log, this.document, key, pen.position(), width);
        case 'gap':
          return new Gap(this.config, this.log, this.document, key, pen.position());
      }
    });
  }

  private getMeasureEntryWidths(): number[] | null {
    if (this.width === null) {
      return null;
    }

    const widths = this.document
      .getMeasureEntries(this.key)
      .map((entry, measureEntryIndex) => {
        const key: MeasureEntryKey = { ...this.key, measureEntryIndex };
        switch (entry.type) {
          case 'fragment':
            return new Fragment(this.config, this.log, this.document, key, Point.origin(), null);
          case 'gap':
            return new Gap(this.config, this.log, this.document, key, Point.origin());
        }
      })
      .map((entry) => entry.rect.w);

    const total = util.sum(widths);

    return widths.map((width) => (width / total) * this.width!);
  }
}
