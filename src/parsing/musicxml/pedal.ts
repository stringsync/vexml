import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { VoiceContext } from './contexts';

type PedalPhase = 'start' | 'continue' | 'stop';

export class Pedal {
  private constructor(
    private phase: PedalPhase,
    private pedalType: data.PedalType,
    private pedalMarkType: data.PedalMarkType
  ) {}

  static create(musicXML: { pedal: musicxml.Pedal }): Pedal {
    let phase: PedalPhase;
    switch (musicXML.pedal.getType()) {
      case 'start':
        phase = 'start';
        break;
      case 'stop':
        phase = 'stop';
        break;
      default:
        phase = 'continue';
        break;
    }

    let pedalType: data.PedalType;
    const line = musicXML.pedal.line();
    const sign = musicXML.pedal.sign();
    if (line && sign) {
      pedalType = 'mixed';
    } else if (line) {
      pedalType = 'bracket';
    } else if (sign) {
      pedalType = 'text';
    } else {
      pedalType = 'bracket';
    }

    let pedalMarkType: data.PedalMarkType;
    switch (musicXML.pedal.getType()) {
      case 'change':
        pedalMarkType = 'change';
        break;
      default:
        pedalMarkType = 'default';
        break;
    }

    return new Pedal(phase, pedalType, pedalMarkType);
  }

  parse(voiceCtx: VoiceContext): void {
    if (this.phase === 'start') {
      voiceCtx.beginPedal(this.pedalType);
    }

    if (this.phase === 'continue') {
      voiceCtx.primeNextPedalMark(this.pedalMarkType);
    }

    if (this.phase === 'stop') {
      voiceCtx.closePedal();
    }
  }
}
