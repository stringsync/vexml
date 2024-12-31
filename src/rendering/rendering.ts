import * as components from '@/components';
import { Score } from './score';
import { RenderContext, RenderLayer } from './types';
import { Logger, PerformanceMonitor, Stopwatch } from '@/debug';
import { Config } from './config';
import { Renderable } from './renderable';

const RENDER_LAYERS: RenderLayer[] = ['staves', 'notes', 'ornaments', 'connectors', 'any'];

export class Rendering {
  constructor(
    private config: Config,
    private log: Logger,
    private ctx: RenderContext,
    private root: components.Root,
    private score: Score
  ) {}

  render(renderable: Renderable): void {
    const descendants = new Set<Renderable>();
    const renderables = [renderable];
    while (renderables.length > 0) {
      const current = renderables.pop();
      if (current && !descendants.has(current)) {
        descendants.add(current);
        renderables.push(...current.children());
      }
    }

    const performanceMonitor = new PerformanceMonitor(this.log, this.config.SLOW_WARNING_THRESHOLD_MS);

    for (const layer of RENDER_LAYERS) {
      // Set elements are yielded in insertion order.
      for (const renderable of descendants) {
        if (renderable.layer() === layer) {
          const stopwatch = Stopwatch.start();

          renderable.render(this.ctx);

          performanceMonitor.check(stopwatch.lap());
        }
      }
    }
  }

  clear(): void {
    this.root.remove();
  }
}
