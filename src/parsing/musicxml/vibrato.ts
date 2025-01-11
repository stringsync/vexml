import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type VibratoPhase = 'start' | 'continue';

export class Vibrato {
  private constructor(private number: number, private phase: VibratoPhase) {}

  static create(musicXML: { wavyLine: musicxml.WavyLine }): Vibrato {
    let phase: VibratoPhase;
    switch (musicXML.wavyLine.getType()) {
      case 'start':
        phase = 'start';
        break;
      default:
        phase = 'continue';
        break;
    }

    const number = musicXML.wavyLine.getNumber();

    return new Vibrato(number, phase);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginVibrato(this.number);
    } else {
      return voiceEntryCtx.continueVibrato(this.number) ?? voiceEntryCtx.beginVibrato(this.number);
    }
  }
}
