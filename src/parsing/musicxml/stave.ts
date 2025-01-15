import * as data from '@/data';
import * as util from '@/util';
import { Signature } from './signature';
import { StaveEvent, VoiceEvent } from './types';
import { Voice } from './voice';
import { PartContext, StaveContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Stave {
  private constructor(
    private config: Config,
    private log: Logger,
    private number: number,
    private partId: string,
    private signature: Signature,
    private voices: Voice[]
  ) {}

  static create(
    config: Config,
    log: Logger,
    number: number,
    partId: string,
    signature: Signature,
    events: StaveEvent[]
  ): Stave {
    const voiceEvents = events.filter((event: any): event is VoiceEvent => typeof event.voiceId === 'string');

    const voices = util.unique(voiceEvents.map((event) => event.voiceId)).map((voiceId) =>
      Voice.create(
        config,
        log,
        voiceId,
        voiceEvents.filter((e) => e.voiceId === voiceId)
      )
    );

    return new Stave(config, log, number, partId, signature, voices);
  }

  parse(partCtx: PartContext): data.Stave {
    const staveCtx = new StaveContext(partCtx, this.number);

    return {
      type: 'stave',
      signature: this.signature.asStaveSignature(this.partId, this.number).parse(),
      voices: this.voices.map((voice) => voice.parse(staveCtx)),
      multiRestCount: staveCtx.getMultiRestCount(),
    };
  }
}
