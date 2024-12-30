import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';
import { MeasureKey, Renderable, RenderContext, RenderLayer, SystemKey } from './types';

export class System implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: SystemKey,
    private position: Point
  ) {}

  get rect(): Rect {
    const rects = this.getChildren().map((renderable) => renderable.rect);
    return Rect.merge(rects);
  }

  get layer(): RenderLayer {
    return 'background';
  }

  render(ctx: RenderContext): void {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const children = this.getChildren();

    for (const child of children) {
      if (child.layer === 'background') {
        child.render(ctx);
      }
    }

    for (const child of children) {
      if (child.layer === 'foreground') {
        child.render(ctx);
      }
    }

    performanceMonitor.check(stopwatch.lap(), this.key);
  }

  @util.memoize()
  getChildren(): Renderable[] {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const children = new Array<Renderable>();

    for (const measure of this.getMeasures()) {
      children.push(measure);
    }

    performanceMonitor.check(stopwatch.lap(), this.key);

    return children;
  }

  private getMeasures(): Measure[] {
    const measures = new Array<Measure>();

    const measureCount = this.document.getMeasures(this.key).length;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureKey: MeasureKey = { ...this.key, measureIndex };
      const measure = new Measure(this.config, this.log, this.document, measureKey, Point.origin(), null);
      measures.push(measure);
    }

    return measures;
  }
}
