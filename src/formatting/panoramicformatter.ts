import * as data from '@/data';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Formatter } from './types';
import { Logger, NoopLogger } from '@/debug';

export type PanoramicFormatterOptions = {
  config?: Config;
  logger?: Logger;
};

/**
 * A formatter formats a document for infinite x-scrolling as a single system.
 */
export class PanoramicFormatter implements Formatter {
  private config: Config;
  private log: Logger;

  constructor(opts?: PanoramicFormatterOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();

    util.assertNull(this.config.WIDTH, 'WIDTH must be null for PanoramicFormatter');
  }

  format(document: data.Document): data.Document {
    const clone = document.clone();
    const measures = clone.score.systems.flatMap((system) => system.measures);
    clone.score.systems = [{ type: 'system', measures }];
    return clone;
  }
}
