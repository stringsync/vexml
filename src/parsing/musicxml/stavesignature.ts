import { Clef } from './clef';
import { Key } from './key';
import { StaveLineCount } from './stavelinecount';
import { Time } from './time';

export class StaveSignature {
  constructor(private staveLineCount: StaveLineCount, private clef: Clef, private key: Key, private time: Time) {}

  getStaveLineCount(): StaveLineCount {
    return this.staveLineCount;
  }

  getClef(): Clef {
    return this.clef;
  }

  getKey(): Key {
    return this.key;
  }

  getTime(): Time {
    return this.time;
  }
}
