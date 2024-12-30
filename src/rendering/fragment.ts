import * as util from '@/util';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, Renderable, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { RenderContext } from 'vexflow';

export class Fragment implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
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
  private getChildren(): Renderable[] {
    return [];
  }
}
