import * as data from '@/data';
import * as util from '@/util';
import { Signature } from './signature';
import { VoiceEvent } from './types';
import { StaveContext, VoiceContext } from './contexts';

export class Voice {
  constructor(private id: string, private signature: Signature, private events: VoiceEvent[]) {
    util.assert(
      events.every((event) => event.voiceId === id),
      'Expected all events to belong to the current voice'
    );
  }

  parse(staveCtx: StaveContext): data.Voice {
    const voiceCtx = new VoiceContext(staveCtx, this.id);

    return {
      type: 'voice',
      entries: this.parseEntries(voiceCtx),
    };
  }

  private parseEntries(voiceCtx: VoiceContext): data.VoiceEntry[] {
    const entries = new Array<data.VoiceEntry>();

    for (const event of this.events) {
      if (event.type === 'note') {
        entries.push(event.note.parse(voiceCtx));
      } else if (event.type === 'rest') {
        entries.push(event.rest.parse());
      } else {
        util.assertUnreachable();
      }
    }

    return entries;
  }
}
