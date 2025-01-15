import * as data from '@/data';
import { Stave } from './stave';
import { Signature } from './signature';
import { StaveEvent } from './types';
import { FragmentContext, PartContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Part {
  private constructor(
    config: Config,
    log: Logger,
    private id: string,
    private signature: Signature,
    private staves: Stave[]
  ) {}

  static create(config: Config, log: Logger, id: string, signature: Signature, events: StaveEvent[]): Part {
    const staves = new Array<Stave>();

    const staveCount = signature.getStaveCount(id).getValue();

    for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
      const stave = Stave.create(
        config,
        log,
        staveNumber,
        id,
        signature,
        events.filter((e) => e.staveNumber === staveNumber)
      );
      staves.push(stave);
    }

    return new Part(config, log, id, signature, staves);
  }

  parse(fragmentCtx: FragmentContext): data.Part {
    const partCtx = new PartContext(fragmentCtx, this.id);

    return {
      type: 'part',
      signature: this.signature.asPartSignature(this.id).parse(),
      staves: this.staves.map((stave) => stave.parse(partCtx)),
    };
  }
}
