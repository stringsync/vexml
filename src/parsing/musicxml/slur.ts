import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type SlurPhase = 'start' | 'continue' | 'stop';

export class Slur {
  constructor(
    private curveNumber: number,
    private phase: SlurPhase,
    private placement: data.CurvePlacement,
    private opening: data.CurveOpening
  ) {}

  static fromMusicXML(musicXML: { slur: musicxml.Slur }): Slur {
    const curveNumber = musicXML.slur.getNumber();
    const placement = musicXML.slur.getPlacement() ?? 'auto';

    let opening: data.CurveOpening = 'auto';
    switch (musicXML.slur.getOrientation()) {
      // Yes, these translations are correct.
      case 'over':
        opening = 'down';
        break;
      case 'under':
        opening = 'up';
        break;
    }

    let phase: SlurPhase;
    switch (musicXML.slur.getType()) {
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

    return new Slur(curveNumber, phase, placement, opening);
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginCurve(this.curveNumber, this.placement, this.opening);
    }
    return (
      voiceEntryCtx.continueCurve(this.curveNumber) ??
      voiceEntryCtx.beginCurve(this.curveNumber, this.placement, this.opening)
    );
  }
}
