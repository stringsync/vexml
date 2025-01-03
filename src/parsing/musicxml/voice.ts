import * as data from '@/data';
import * as util from '@/util';
import { Signature } from './signature';
import { VoiceEvent } from './types';
import { Key } from './key';

export class Voice {
  constructor(private id: string, private signature: Signature, private events: VoiceEvent[]) {
    util.assert(
      events.every((event) => event.voiceId === id),
      'Expected all events to belong to the current voice'
    );
  }

  parse(key: Key): data.Voice {
    return {
      type: 'voice',
      entries: this.parseEntries(key),
    };
  }

  private parseEntries(key: Key): data.VoiceEntry[] {
    const entries = new Array<data.VoiceEntry>();

    for (const event of this.events) {
      if (event.type === 'note') {
        entries.push(event.note.parse(key));
      }
    }

    return entries;
  }
}
