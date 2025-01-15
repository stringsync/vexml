import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

type BeamPhase = 'start' | 'continue';

export class Beam {
  constructor(private config: Config, private log: Logger, private phase: BeamPhase) {}

  static create(config: Config, log: Logger, musicXML: { beam: musicxml.Beam }): Beam {
    let phase: BeamPhase;
    switch (musicXML.beam.getBeamValue()) {
      case 'begin':
        phase = 'start';
        break;
      default:
        phase = 'continue';
        break;
    }

    return new Beam(config, log, phase);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginBeam();
    }
    return voiceEntryCtx.continueBeam() ?? voiceEntryCtx.beginBeam();
  }
}
