import * as data from '@/data';
import { Part } from './part';
import { Signature } from './signature';
import { StaveEvent } from './types';
import { FragmentContext, MeasureContext } from './contexts';

export class Fragment {
  private constructor(private signature: Signature, private parts: Part[]) {}

  static create(signature: Signature, events: StaveEvent[], partIds: string[]) {
    const parts = partIds.map((partId) =>
      Part.create(
        partId,
        signature,
        events.filter((e) => e.partId === partId)
      )
    );

    return new Fragment(signature, parts);
  }

  getSignature(): Signature {
    return this.signature;
  }

  parse(ctx: MeasureContext): data.Fragment {
    const fragmentCtx = new FragmentContext(ctx, this.signature);

    return {
      type: 'fragment',
      width: null,
      signature: this.signature.asFragmentSignature().parse(),
      parts: this.parts.map((part) => part.parse(fragmentCtx)),
    };
  }
}
