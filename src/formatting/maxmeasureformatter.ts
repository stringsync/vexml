import * as data from '@/data';
import * as util from '@/util';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Formatter } from './types';
import { Logger, NoopLogger } from '@/debug';

export type MaxMeasureFormatterOptions = {
  config?: Config;
  logger?: Logger;
};

/**
 * A formatter that limits the number of measures per system.
 */
export class MaxMeasureFormatter implements Formatter {
  private config: Config;
  private log: Logger;

  constructor(private maxMeasuresPerSystemCount: number, opts?: MaxMeasureFormatterOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();

    util.assert(maxMeasuresPerSystemCount > 0, 'maxMeasuresPerSystemCount must be greater than 0');
  }

  format(document: data.Document): data.Document {
    const clone = document.clone();

    const measures = clone.score.systems.flatMap((system) => system.measures);

    clone.score.systems = [];

    for (let index = 0; index < measures.length; index += this.maxMeasuresPerSystemCount) {
      const systemMeasures = measures.slice(index, index + this.maxMeasuresPerSystemCount);
      clone.score.systems.push({ type: 'system', measures: systemMeasures });
    }

    return clone;
  }
}
