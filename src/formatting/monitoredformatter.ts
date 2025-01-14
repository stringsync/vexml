import * as data from '@/data';
import { Config } from '@/config';
import { Formatter } from './types';
import { Logger, Stopwatch } from '@/debug';

/**
 * A formatter that tracks how long its child formatter takes to format a document.
 */
export class MonitoredFormatter implements Formatter {
  constructor(private formatter: Formatter, private log: Logger) {}

  format(config: Config, document: data.Document): data.Document {
    const stopwatch = Stopwatch.start();

    const formatted = this.formatter.format(config, document);

    const lap = stopwatch.lap();
    if (lap < 1) {
      this.log.info(`formatted score in <1ms`);
    } else {
      this.log.info(`formatted score in ${Math.round(lap)}ms`);
    }

    return formatted;
  }
}
