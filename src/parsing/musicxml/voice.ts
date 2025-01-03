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

    const accidentalCodesByPitch: Record<string, data.AccidentalCode> = {};

    for (const event of this.events) {
      if (event.type === 'note') {
        const pitch = event.note.getPitch();
        const accidentalCode = accidentalCodesByPitch[pitch] ?? null;

        const note = event.note.parse(key, accidentalCode);

        const accidental = note.mods.find((mod): mod is data.Accidental => mod.type === 'accidental');
        if (accidental) {
          accidentalCodesByPitch[pitch] = accidental.code;
        }

        entries.push(note);
      }
    }

    return entries;
  }
}
