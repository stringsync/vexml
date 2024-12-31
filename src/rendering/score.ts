import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { System } from './system';
import { Title } from './title';
import { Rect } from '@/spatial';
import { Renderable, RenderContext, RenderLayer, SystemKey } from './types';
import { Spacer } from './spacer';
import { Pen } from './pen';

export class Score implements Renderable {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  @util.memoize()
  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  layer(): RenderLayer {
    return 'any';
  }

  @util.memoize()
  children(): Renderable[] {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const children = new Array<Renderable>();

    const pen = new Pen();

    const topSpacer = Spacer.vertical(pen.x, pen.y, this.config.SCORE_PADDING_TOP);
    children.push(topSpacer);
    pen.moveBy({ dy: topSpacer.rect().h });

    // TODO: Inject a score formatting type and use it to determine the title's position.
    const title = this.getTitle(pen);
    if (title) {
      children.push(title);
    }

    for (const system of this.getSystems(pen)) {
      children.push(system);
    }

    const bottomSpacer = Spacer.vertical(pen.x, pen.y, this.config.SCORE_PADDING_BOTTOM);
    children.push(bottomSpacer);
    pen.moveBy({ dy: bottomSpacer.rect().h });

    performanceMonitor.check(stopwatch.lap());

    return children;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext) {}

  private getTitle(pen: Pen): Title | null {
    if (this.document.getTitle()) {
      const title = new Title(this.config, this.log, this.document, pen.position());
      pen.moveBy({ dy: title.rect().h });
      return title;
    } else {
      return null;
    }
  }

  private getSystems(pen: Pen): System[] {
    const systems = new Array<System>();

    const systemCount = this.document.getSystems().length;

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };
      const system = new System(this.config, this.log, this.document, key, pen.position());
      systems.push(system);
      pen.moveBy({ dy: system.rect().h });
    }

    return systems;
  }
}
