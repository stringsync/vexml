import * as data from '@/data';
import { Part } from './part';
import { Signature } from './signature';
import { StaveEvent } from './types';
import { FragmentContext, MeasureContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Fragment {
  private constructor(
    private config: Config,
    private log: Logger,
    private signature: Signature,
    private parts: Part[]
  ) {}

  static create(config: Config, log: Logger, signature: Signature, events: StaveEvent[], partIds: string[]) {
    const parts = partIds.map((partId) =>
      Part.create(
        config,
        log,
        partId,
        signature,
        events.filter((e) => e.partId === partId)
      )
    );

    return new Fragment(config, log, signature, parts);
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
