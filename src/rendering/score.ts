import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { System } from './system';
import { Title } from './title';
import { Point, Rect } from '@/spatial';
import { Renderable, RenderContext, RenderLayer, SystemKey } from './types';
import { Spacer } from './spacer';

export class Score implements Renderable {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  layer(): RenderLayer {
    return 'any';
  }

  children(): Renderable[] {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const children = new Array<Renderable>();

    let y = 0;

    const topSpacer = Spacer.vertical(y, y + this.config.SCORE_PADDING_TOP);
    children.push(topSpacer);
    y += topSpacer.rect().h;

    // TODO: Inject a score formatting type and use it to determine the title's position.
    const title = this.getTitle(new Point(0, y));
    if (title) {
      children.push(title);
      y += title.rect().h;
    }

    for (const system of this.getSystems(y)) {
      children.push(system);
      y += system.rect().h;
    }

    const bottomSpacer = Spacer.vertical(y, y + this.config.SCORE_PADDING_BOTTOM);
    children.push(Spacer.vertical(y, y + this.config.SCORE_PADDING_BOTTOM));
    y += bottomSpacer.rect().h;

    performanceMonitor.check(stopwatch.lap());

    return children;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext) {}

  private getTitle(position: Point): Title | null {
    if (this.document.getTitle()) {
      return new Title(this.config, this.log, this.document, position);
    } else {
      return null;
    }
  }

  private getSystems(y: number): System[] {
    const systems = new Array<System>();

    const systemCount = this.document.getSystems().length;

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };
      const position = new Point(0, y);
      const system = new System(this.config, this.log, this.document, key, position);
      systems.push(system);
      y += system.rect().h;
    }

    return systems;
  }
}
