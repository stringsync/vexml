import { Part } from './part';
import { Signature } from './signature';
import { LeafEvent } from './types';

export class Fragment {
  constructor(private signature: Signature, private events: LeafEvent[], private partIds: string[]) {}

  getSignature(): Signature {
    return this.signature;
  }

  getParts(): Part[] {
    return this.partIds.map(
      (partId) =>
        new Part(
          partId,
          this.signature,
          this.events.filter((e) => e.partId === partId)
        )
    );
  }
}
