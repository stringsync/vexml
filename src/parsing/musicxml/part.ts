import * as util from '@/util';
import { Stave } from './stave';
import { Signature } from './signature';
import { StaveEvent } from './types';

export class Part {
  constructor(private id: string, private signature: Signature, private events: StaveEvent[]) {
    util.assert(
      events.every((event) => event.partId === id),
      'Expected all events to belong to the current part'
    );
  }

  getId(): string {
    return this.id;
  }

  getSignature(): Signature {
    return this.signature;
  }

  getStaves(): Stave[] {
    const staveCount = this.signature.getStaveCount(this.id).getValue();

    const staves = new Array<Stave>();

    for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
      const stave = new Stave(
        staveNumber,
        this.id,
        this.signature,
        this.events.filter((e) => e.staveNumber === staveNumber)
      );
      staves.push(stave);
    }

    return staves;
  }
}
