import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { System } from './system';
import { RenderLayer, SystemKey } from './types';
import { Spacer } from './spacer';
import { Pen } from './pen';
import { Label } from './label';
import { Renderable } from './renderable';

export class Score extends Renderable {
  constructor(private config: Config, private log: Logger, private document: Document) {
    super();
  }

  @util.memoize()
  children(): Renderable[] {
    const stopwatch = Stopwatch.start();
    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    const children = new Array<Renderable>();

    const pen = new Pen();

    const topSpacer = Spacer.vertical(pen.x, pen.y, this.config.SCORE_PADDING_TOP);
    children.push(topSpacer);
    pen.moveBy({ dy: topSpacer.rect.h });

    // TODO: Inject a score formatting type and use it to determine the title's position.
    const title = this.getTitleLabel(pen);
    if (title) {
      children.push(title);
    }

    for (const system of this.getSystems(pen)) {
      children.push(system);
    }

    const bottomSpacer = Spacer.vertical(pen.x, pen.y, this.config.SCORE_PADDING_BOTTOM);
    children.push(bottomSpacer);
    pen.moveBy({ dy: bottomSpacer.rect.h });

    performanceMonitor.check(stopwatch.lap());

    return children;
  }

  private getTitleLabel(pen: Pen): Label | null {
    const title = this.document.getTitle();
    if (title) {
      const label = new Label(
        this.config,
        this.log,
        title,
        pen.position(),
        { bottom: this.config.TITLE_PADDING_BOTTOM },
        { color: 'black', family: this.config.TITLE_FONT_FAMILY, size: this.config.TITLE_FONT_SIZE }
      );
      pen.moveBy({ dy: label.rect.h });
      return label;
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
      pen.moveBy({ dy: system.rect.h });
    }

    return systems;
  }
}
