import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { VoiceEntryContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

type VibratoPhase = 'start' | 'continue';

export class Vibrato {
  private constructor(
    private config: Config,
    private log: Logger,
    private number: number,
    private phase: VibratoPhase
  ) {}

  static create(config: Config, log: Logger, musicXML: { wavyLine: musicxml.WavyLine }): Vibrato {
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

    return new Vibrato(config, log, number, phase);
  }

  static fromMdom(config: Config, log: Logger, mdom: { wavyLine: mdom.WavyLine }): Vibrato {
    const phase: VibratoPhase = mdom.wavyLine.wavyLineType === 'start' ? 'start' : 'continue';
    const number = parseInt(mdom.wavyLine.number, 10);
    return new Vibrato(config, log, number, phase);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginVibrato(this.number);
    } else {
      return voiceEntryCtx.continueVibrato(this.number) ?? voiceEntryCtx.beginVibrato(this.number);
    }
  }
}
