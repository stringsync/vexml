import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type TupletPhase = 'start' | 'continue';

export class Tuplet {
  constructor(private number: number, private phase: TupletPhase, private showNumber: boolean) {}

  static fromMusicXML(musicXML: { tuplet: musicxml.Tuplet }): Tuplet {
    let phase: TupletPhase;
    switch (musicXML.tuplet.getType()) {
      case 'start':
        phase = 'start';
        break;
      default:
        phase = 'continue';
        break;
    }

    const number = musicXML.tuplet.getNumber();
    const showNumber = musicXML.tuplet.getShowNumber() === 'both';

    return new Tuplet(number, phase, showNumber);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginTuplet(this.number, this.showNumber);
    }
    return voiceEntryCtx.continueTuplet(this.number) ?? voiceEntryCtx.beginTuplet(this.number, this.showNumber);
  }
}
