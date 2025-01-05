import * as data from '@/data';
import * as util from '@/util';
import { Signature } from './signature';
import { StaveEvent, VoiceEvent } from './types';
import { Voice } from './voice';
import { PartContext, StaveContext } from './contexts';

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

  parse(partCtx: PartContext): data.Stave {
    const staveCtx = new StaveContext(partCtx, this.number);

    return {
      type: 'stave',
      signature: this.signature.asStaveSignature(this.partId, this.number).parse(),
      voices: this.getVoices().map((voice) => voice.parse(staveCtx)),
      multiRestCount: staveCtx.getMultiRestCount(),
    };
  }

  getPartId(): string {
    return this.partId;
  }

  getNumber(): number {
    return this.number;
  }

  private getVoices(): Voice[] {
    const voiceEvents = this.getVoiceEvents();

    return util.unique(voiceEvents.map((event) => event.voiceId)).map(
      (voiceId) =>
        new Voice(
          voiceId,
          this.signature,
          voiceEvents.filter((e) => e.voiceId === voiceId)
        )
    );
  }

  private getVoiceEvents(): VoiceEvent[] {
    return this.events.filter((event: any): event is VoiceEvent => typeof event.voiceId === 'string');
  }
}
