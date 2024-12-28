import * as data from '@/data';
import * as util from '@/util';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger } from '@/debug';
import { Rendering } from './rendering';
import { Prerendering } from './prerendering';
import { NoopRenderContext } from './nooprendercontext';

export type RenderOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: Document;

  constructor(document: data.Document) {
    this.document = new Document(document);
  }

  render(element: HTMLDivElement, opts?: RenderOptions): Rendering {
    const config = { ...DEFAULT_CONFIG, ...opts?.config };
    const log = opts?.logger ?? new NoopLogger();
    return this.prerender(config, log).render(element);
  }

  @util.memoize()
  private prerender(config: Config, log: Logger): Prerendering {
    const start = performance.now();

    const ctx = new NoopRenderContext();
    const score = new Score(config, log, this.document).render(ctx);

    const stop = performance.now();
    const elapsed = stop - start;
    log.info(`prerendered in ${elapsed.toFixed(2)}ms`);

    return new Prerendering(config, log, this.document, { score });
  }
}
