import * as util from '@/util';
import { Stave } from './stave';
import { Signature } from './signature';
import { LeafEvent } from './types';

export class Part {
  constructor(private id: string, private signature: Signature, private events: LeafEvent[]) {
    util.assert(
      events.every((event) => event.partId === id),
      'Expected all leaf events to belong to the current part'
    );
  }

  getId(): string {
    return this.id;
  }

  getSignature(): Signature {
    return this.signature;
  }

  getStaves(): Stave[] {
    return [];
  }
}
