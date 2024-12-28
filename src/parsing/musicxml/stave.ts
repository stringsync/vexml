import * as util from '@/util';
import { Chorus } from './chorus';
import { Signature } from './signature';
import { StaveEvent } from './types';

export class Stave {
  constructor(
    private number: number,
    private partId: string,
    private signature: Signature,
    private events: StaveEvent[]
  ) {
    util.assert(
      events.every((event) => event.staveNumber === number),
      'Expected all leaf events to belong to the current stave'
    );
  }

  getPartId(): string {
    return this.partId;
  }

  getNumber(): number {
    return this.number;
  }

  getSignature(): Signature {
    return this.signature;
  }

  getChorus(): Chorus {
    return new Chorus();
  }
}
