import * as data from '@/data';
import * as util from '@/util';
import * as elements from '@/elements';
import * as formatters from './formatters';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger, Stopwatch } from '@/debug';
import { Rendering } from './rendering';
import { Prerendering } from './prerendering';
import { Formatter } from './types';

export type RenderOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: Document;

  constructor(document: data.Document) {
    this.document = new Document(document);
  }

  render(div: HTMLDivElement, opts?: RenderOptions): Rendering {
    const config = { ...DEFAULT_CONFIG, ...opts?.config };
    const log = opts?.logger ?? new NoopLogger();
    return this.prerender(config, log).render(div);
  }

  @util.memoize()
  private prerender(config: Config, log: Logger): Prerendering {
    const stopwatch = Stopwatch.start();

    const scoreElement = new Score(config, log, this.document).render();
    const formatter = this.getFormatter(config, log, { score: scoreElement });
    const document = formatter.format();

    log.info(`prerendered in ${stopwatch.lap().toFixed(2)}ms`);

    // TODO: Use real width and height.
    return new Prerendering(config, log, document, config.WIDTH!, 400);
  }

  private getFormatter(config: Config, log: Logger, elements: { score: elements.Score }): Formatter {
    const width = config.WIDTH;
    const height = config.HEIGHT;

    if (width && !height) {
      log.debug('using UndefinedHeightFormatter');
      return new formatters.UndefinedHeightFormatter(config, log, this.document, elements);
    }

    if (!width && height) {
      log.debug('using UndefinedWidthFormatter');
      return new formatters.UndefinedWidthFormatter();
    }

    if (!width && !height) {
      log.debug('using UndefinedWidthFormatter');
      return new formatters.UndefinedWidthFormatter();
    }

    log.debug('using DefaultFormatter');
    return new formatters.DefaultFormatter();
  }
}
