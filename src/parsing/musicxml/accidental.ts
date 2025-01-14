import * as data from '@/data';
import { VoiceEntryContext } from './contexts';

export class Accidental {
  constructor(public readonly code: data.AccidentalCode, public readonly isCautionary: boolean) {}

  parse(voiceEntryCtx: VoiceEntryContext): data.Accidental {
    voiceEntryCtx.setActiveAccidental(this.code);

    return {
      type: 'accidental',
      code: this.code,
      isCautionary: this.isCautionary,
    };
  }
}
