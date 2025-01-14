import * as data from '@/data';
import * as rendering from '@/rendering';
import * as util from '@/util';
import { Formatter } from './types';

/**
 * A formatter that limits the number of measures per system.
 */
export class MaxMeasureFormatter implements Formatter {
  constructor(private maxMeasuresPerSystemCount: number) {
    util.assert(maxMeasuresPerSystemCount > 0, 'maxMeasuresPerSystemCount must be greater than 0');
  }

  format(config: rendering.Config, document: data.Document): data.Document {
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
