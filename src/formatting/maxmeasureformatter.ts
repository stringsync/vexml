import * as rendering from '@/rendering';
import * as data from '@/data';
import { Logger } from '@/debug';
import { Formatter } from './types';

/**
 * A formatter that limits the number of measures per system.
 */
export class MaxMeasureFormatter implements Formatter {
  constructor(private maxMeasuresPerSystemCount: number, private config: rendering.Config, private log: Logger) {}

  format(document: data.Document): data.Document {
    const clone = document.clone();
    const measures = clone.score.systems.flatMap((system) => system.measures);

    for (let index = 0; index < measures.length; index += this.maxMeasuresPerSystemCount) {
      const systemMeasures = measures.slice(index, index + this.maxMeasuresPerSystemCount);
      clone.score.systems.push({ type: 'system', measures: systemMeasures });
    }

    return clone;
  }
}
