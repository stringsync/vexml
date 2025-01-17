import * as data from '@/data';
import { StaveCount } from './stavecount';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class PartSignature {
  constructor(private config: Config, private log: Logger, private staveCount: StaveCount) {}

  parse(): data.PartSignature {
    return {
      type: 'partsignature',
      staveCount: this.staveCount.getValue(),
    };
  }
}
