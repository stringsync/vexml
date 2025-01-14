import * as data from '@/data';
import { Formatter } from './types';
import { Logger, Stopwatch } from '@/debug';

/**
 * A formatter that tracks how long its child formatter takes to format a document.
 */
export class MonitoredFormatter implements Formatter {
  constructor(private formatter: Formatter, private log: Logger) {}

  format(document: data.Document): data.Document {
    const stopwatch = Stopwatch.start();

    const formatted = this.formatter.format(document);

    const lap = stopwatch.lap();
    if (lap < 1) {
      this.log.info(`formatted score in ${lap.toFixed(3)}ms`);
    } else {
      this.log.info(`formatted score in ${Math.round(lap)}ms`);
    }

    return formatted;
  }
}
