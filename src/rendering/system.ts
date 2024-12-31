import * as util from '@/util';
import { Point } from '@/spatial';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';
import { MeasureKey, RenderLayer, SystemKey } from './types';
import { Pen } from './pen';
import { Spacer } from './spacer';
import { Renderable } from './renderable';

export class System extends Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: SystemKey,
    private position: Point
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

    for (const measure of this.getMeasures(pen)) {
      children.push(measure);
    }

    const bottomSpacer = Spacer.vertical(pen.x, pen.y, this.config.SYSTEM_PADDING_BOTTOM);
    children.push(bottomSpacer);
    pen.moveBy({ dy: bottomSpacer.rect.h });

    performanceMonitor.check(stopwatch.lap(), this.key);

    return children;
  }

  private getMeasures(pen: Pen): Measure[] {
    const measures = new Array<Measure>();

    const measureCount = this.document.getMeasures(this.key).length;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureKey: MeasureKey = { ...this.key, measureIndex };
      const measure = new Measure(this.config, this.log, this.document, measureKey, pen.position(), null);
      measures.push(measure);
      pen.moveBy({ dx: measure.rect.w });
    }

    return measures;
  }
}
