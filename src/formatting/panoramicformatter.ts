import * as rendering from '@/rendering';
import * as data from '@/data';
import { Logger } from '@/debug';
import { Formatter } from './types';

/**
 * A formatter formats a document for infinite x-scrolling as a single system.
 */
export class PanoramicFormatter implements Formatter {
  constructor(private config: rendering.Config, private log: Logger) {}

  format(document: data.Document): data.Document {
    const clone = document.clone();
    const measures = clone.score.systems.flatMap((system) => system.measures);
    clone.score.systems = [{ type: 'system', measures }];
    return clone;
  }
}
