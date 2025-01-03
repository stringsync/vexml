import * as data from '@/data';
import * as util from '@/util';
import { Signature } from './signature';
import { VoiceEntry, VoiceEvent } from './types';

export class Voice {
  constructor(private id: string, private signature: Signature, private events: VoiceEvent[]) {
    util.assert(
      events.every((event) => event.voiceId === id),
      'Expected all events to belong to the current voice'
    );
  }

  parse(): data.Voice {
    return {
      type: 'voice',
      entries: this.getEntries().map((entry) => entry.parse()),
    };
  }

  getEntries(): VoiceEntry[] {
    return this.events.map((event) => event.note);
  }
}
