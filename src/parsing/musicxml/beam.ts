import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type BeamPhase = 'start' | 'continue';

export class Beam {
  constructor(private phase: BeamPhase) {}

  static fromMusicXML(musicXML: { beam: musicxml.Beam }): Beam {
    let phase: BeamPhase;
    switch (musicXML.beam.getBeamValue()) {
      case 'begin':
        phase = 'start';
        break;
      default:
        phase = 'continue';
        break;
    }

    return new Beam(phase);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginBeam();
    }
    return voiceEntryCtx.continueBeam() ?? voiceEntryCtx.beginBeam();
  }
}
