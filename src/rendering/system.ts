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

    const measureWidths = this.getMeasureWidths();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureKey: MeasureKey = { ...this.key, measureIndex };
      const width = measureWidths?.at(measureIndex) ?? null;
      const measure = new Measure(this.config, this.log, this.document, measureKey, pen.position(), width);
      measures.push(measure);
      pen.moveBy({ dx: measure.rect.w });
    }

    return measures;
  }

  private getMeasureWidths(): number[] | null {
    if (!this.config.WIDTH) {
      return null; // use intrinsic widths
    }

    const widths = this.document
      .getMeasures(this.key)
      .map<MeasureKey>((_, measureIndex) => ({ ...this.key, measureIndex }))
      .map((measureKey) => new Measure(this.config, this.log, this.document, measureKey, Point.origin(), null))
      .map((measure) => measure.rect.w);

    const total = util.sum(widths);

    return widths.map((width) => width / total).map((fraction) => fraction * this.config.WIDTH!);
  }
}
