import * as musicxml from '@/musicxml';
import { VoiceContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

type OctaveShiftPhase = 'start' | 'continue' | 'stop';

export class OctaveShift {
  private constructor(
    private config: Config,
    private log: Logger,
    private phase: OctaveShiftPhase,
    private size: number
  ) {}

  static create(config: Config, log: Logger, musicXML: { octaveShift: musicxml.OctaveShift }): OctaveShift {
    const type = musicXML.octaveShift.getType();
    const factor = type === 'down' ? -1 : 1;
    const size = factor * musicXML.octaveShift.getSize();

    let phase: OctaveShiftPhase;
    switch (type) {
      case 'down':
        phase = 'start';
        break;
      case 'up':
        phase = 'start';
        break;
      case 'stop':
        phase = 'stop';
        break;
      default:
        phase = 'continue';
        break;
    }

    return new OctaveShift(config, log, phase, size);
  }

  parse(voiceCtx: VoiceContext): void {
    if (this.phase === 'start') {
      voiceCtx.beginOctaveShift(this.size);
    }

    if (this.phase === 'stop') {
      voiceCtx.closeOctaveShift();
    }
  }
}
