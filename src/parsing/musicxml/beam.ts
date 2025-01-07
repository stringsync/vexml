import * as musicxml from '@/musicxml';
import { NoteContext } from './contexts';

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

  parse(noteCtx: NoteContext): string {
    if (this.phase === 'start') {
      return noteCtx.beginBeam();
    }
    return noteCtx.continueBeam() ?? noteCtx.beginBeam();
  }
}
