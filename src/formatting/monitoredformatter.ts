import * as data from '@/data';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Formatter } from './types';
import { Logger, Stopwatch } from '@/debug';

export type MonitoredFormatterOptions = {
  config?: Config;
};

/**
 * A formatter that tracks how long its child formatter takes to format a document.
 */
export class MonitoredFormatter implements Formatter {
  private config: Config;
  private log: Logger;

  constructor(private formatter: Formatter, logger: Logger, opts?: MonitoredFormatterOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = logger;
  }

  format(document: data.Document): data.Document {
    const stopwatch = Stopwatch.start();

    const formatted = this.formatter.format(document);

    const lap = stopwatch.lap();
    if (lap < 1) {
      this.log.info(`formatted score in <1ms`);
    } else {
      this.log.info(`formatted score in ${Math.round(lap)}ms`);
    }

    return formatted;
  }
}
