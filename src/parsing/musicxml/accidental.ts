import * as data from '@/data';
import { VoiceEntryContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Accidental {
  constructor(
    private config: Config,
    private log: Logger,
    public readonly code: data.AccidentalCode,
    public readonly isCautionary: boolean
  ) {}

  parse(voiceEntryCtx: VoiceEntryContext): data.Accidental {
    voiceEntryCtx.setActiveAccidental(this.code);

    return {
      type: 'accidental',
      code: this.code,
      isCautionary: this.isCautionary,
    };
  }
}
