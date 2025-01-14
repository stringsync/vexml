import * as data from '@/data';
import { StaveCount } from './stavecount';

export class PartSignature {
  constructor(private staveCount: StaveCount) {}

  parse(): data.PartSignature {
    return {
      type: 'partsignature',
      staveCount: this.staveCount.getValue(),
    };
  }
}
