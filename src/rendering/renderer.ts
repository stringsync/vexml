import * as data from '@/data';
import * as elements from '@/elements';
import { Document } from './document';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger } from '@/debug';

export type RendererOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class Renderer {
  private document: data.Document;
  private config: Config;
  private log: Logger;

  constructor(document: data.Document, opts?: RendererOptions) {
    this.document = document;
    this.config = { ...opts?.config, ...DEFAULT_CONFIG };
    this.log = opts?.logger ?? new NoopLogger();
  }

  render(): elements.Score {
    const document = new Document(this.document);
    const score = new Score(this.config, this.log, document);

    const start = performance.now();
    this.log.debug('prerender start');

    const element = score.render();

    const end = performance.now();
    this.log.debug('prerender stop', { duration: `${end - start}ms` });

    return element;
  }
}
