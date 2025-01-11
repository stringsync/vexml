import * as data from '@/data';
import * as util from '@/util';
import { VoiceEvent } from './types';
import { StaveContext, VoiceContext } from './contexts';
import { Rest } from './rest';

export class Voice {
  private constructor(private id: string, private events: VoiceEvent[]) {
    util.assert(
      events.every((event) => event.voiceId === id),
      'Expected all events to belong to the current voice'
    );
  }

  static create(id: string, events: VoiceEvent[]): Voice {
    return new Voice(id, events);
  }

  parse(staveCtx: StaveContext): data.Voice {
    const voiceCtx = new VoiceContext(staveCtx, this.id);

    if (voiceCtx.getMultiRestCount() > 0) {
      const time = voiceCtx.getTime();
      const rest = Rest.whole(time);
      return {
        type: 'voice',
        entries: [rest.parse(voiceCtx)],
        beams: [],
        tuplets: [],
      };
    }

    return {
      type: 'voice',
      entries: this.parseEntries(voiceCtx),
      beams: voiceCtx.getBeams(),
      tuplets: voiceCtx.getTuplets(),
    };
  }

  private parseEntries(voiceCtx: VoiceContext): data.VoiceEntry[] {
    const entries = new Array<data.VoiceEntry>();

    for (const event of this.events) {
      switch (event.type) {
        case 'note':
          entries.push(event.note.parse(voiceCtx));
          break;
        case 'rest':
          entries.push(event.rest.parse(voiceCtx));
          break;
        case 'chord':
          entries.push(event.chord.parse(voiceCtx));
          break;
        case 'dynamics':
          entries.push(event.dynamics.parse());
          break;
        case 'wedge':
          event.wedge.parse(voiceCtx);
          break;
        case 'pedal':
          event.pedal.parse(voiceCtx);
          break;
        case 'octaveshift':
          event.octaveShift.parse(voiceCtx);
          break;
        default:
          util.assertUnreachable();
      }
    }

    return entries;
  }
}
