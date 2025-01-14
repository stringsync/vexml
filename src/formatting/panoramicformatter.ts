import * as data from '@/data';

import * as util from '@/util';
import { Config } from '@/config';
import { Formatter } from './types';

/**
 * A formatter formats a document for infinite x-scrolling as a single system.
 */
export class PanoramicFormatter implements Formatter {
  format(config: Config, document: data.Document): data.Document {
    util.assertNull(config.WIDTH, 'WIDTH must be null for PanoramicFormatter');

    const clone = document.clone();
    const measures = clone.score.systems.flatMap((system) => system.measures);
    clone.score.systems = [{ type: 'system', measures }];
    return clone;
  }
}
