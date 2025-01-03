import * as data from '@/data';
import { Part } from './part';
import { Signature } from './signature';
import { StaveEvent } from './types';

export class Fragment {
  constructor(private signature: Signature, private events: StaveEvent[], private partIds: string[]) {}

  parse(): data.Fragment {
    return {
      type: 'fragment',
      width: null,
      signature: this.signature.asFragmentSignature().parse(),
      parts: this.getParts().map((part) => part.parse()),
    };
  }

  getSignature(): Signature {
    return this.signature;
  }

  private getParts(): Part[] {
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
