import * as util from '@/util';
import { Signature } from './signature';
import { StaveEvent, VoiceEvent } from './types';
import { Voice } from './voice';

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

  getVoices(): Voice[] {
    const voiceEvents = this.getVoiceEvents();

    return util
      .unique(voiceEvents.map((event) => event.voiceId))
      .map((voiceId) => new Voice(voiceId, this.signature, voiceEvents));
  }

  private getVoiceEvents(): VoiceEvent[] {
    return this.events.filter((event): event is VoiceEvent => event.type === 'note');
  }
}
