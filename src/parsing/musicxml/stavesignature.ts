import * as data from '@/data';
import { Clef } from './clef';
import { Key } from './key';
import { StaveLineCount } from './stavelinecount';
import { Time } from './time';

export class StaveSignature {
  constructor(private staveLineCount: StaveLineCount, private clef: Clef, private key: Key, private time: Time) {}

  parse(): data.StaveSignature {
    return {
      type: 'stavesignature',
      lineCount: this.staveLineCount.getValue(),
      clef: this.clef.parse(),
      key: this.key.parse(),
      time: this.time.parse(),
    };
  }
}
