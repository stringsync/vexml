import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { StaveContext, VoiceContext } from './contexts';

type WedgePhase = 'start' | 'continue' | 'stop';

export class Wedge {
  private constructor(
    private phase: WedgePhase,
    private wedgeType: data.WedgeType,
    private placement: data.WedgePlacement
  ) {}

  static create(musicXML: { direction: musicxml.Direction; wedge: musicxml.Wedge }): Wedge {
    let phase: WedgePhase;
    switch (musicXML.wedge.getType()) {
      case 'crescendo':
        phase = 'start';
        break;
      case 'diminuendo':
        phase = 'start';
        break;
      case 'stop':
        phase = 'stop';
        break;
      default:
        phase = 'continue';
        break;
    }

    let wedgeType: data.WedgeType;
    switch (musicXML.wedge.getType()) {
      case 'crescendo':
        wedgeType = 'crescendo';
        break;
      case 'diminuendo':
        wedgeType = 'diminuendo';
        break;
      default:
        wedgeType = 'crescendo';
        break;
    }

    const placement = musicXML.direction.getPlacement() ?? 'below';

    return new Wedge(phase, wedgeType, placement);
  }

  getPhase(): WedgePhase {
    return this.phase;
  }

  parse(voiceCtx: VoiceContext): void {
    if (this.phase === 'start') {
      voiceCtx.beginWedge(this.placement, this.wedgeType);
    } else if (this.phase === 'stop') {
      voiceCtx.closeWedge();
    }
  }
}
