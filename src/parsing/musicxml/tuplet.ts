import * as musicxml from '@/musicxml';
import * as data from '@/data';
import { VoiceEntryContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

type TupletPhase = 'start' | 'stop';

export class Tuplet {
  constructor(
    private config: Config,
    private log: Logger,
    private number: number,
    private phase: TupletPhase,
    private showNumber: boolean,
    private placement: data.TupletPlacement
  ) {}

  static create(config: Config, log: Logger, musicXML: { tuplet: musicxml.Tuplet }): Tuplet {
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

    return new Tuplet(config, log, number, phase, showNumber, placement);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string | null {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginTuplet(this.number, this.showNumber, this.placement);
    }
    return voiceEntryCtx.closeTuplet(this.number);
  }
}
