import * as musicxml from '@/musicxml';
import * as data from '@/data';
import { VoiceEntryContext } from './contexts';

type TupletPhase = 'start' | 'stop';

export class Tuplet {
  constructor(
    private number: number,
    private phase: TupletPhase,
    private showNumber: boolean,
    private placement: data.TupletPlacement
  ) {}

  static create(musicXML: { tuplet: musicxml.Tuplet }): Tuplet {
    let phase: TupletPhase;
    switch (musicXML.tuplet.getType()) {
      case 'start':
        phase = 'start';
        break;
      default:
        phase = 'stop';
        break;
    }

    const number = musicXML.tuplet.getNumber();
    const showNumber = musicXML.tuplet.getShowNumber() === 'both';
    const placement = musicXML.tuplet.getPlacement();

    return new Tuplet(number, phase, showNumber, placement);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string | null {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginTuplet(this.number, this.showNumber, this.placement);
    }
    return voiceEntryCtx.closeTuplet(this.number);
  }
}
