import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type TiePhase = 'start' | 'continue' | 'let-ring' | 'stop';

export class Tie {
  constructor(
    private curveNumber: number | null,
    private phase: TiePhase,
    private placement: data.CurvePlacement,
    private opening: data.CurveOpening
  ) {}

  static fromMusicXML(musicXML: { tie: musicxml.Tied }): Tie {
    const curveNumber = musicXML.tie.getNumber();
    const placement: data.CurvePlacement = musicXML.tie.getPlacement() ?? 'auto';

    let opening: data.CurveOpening = 'auto';
    // Yes, these translations are correct.
    switch (musicXML.tie.getOrientation()) {
      case 'over':
        opening = 'down';
        break;
      case 'under':
        opening = 'up';
        break;
    }

    let phase: TiePhase;
    switch (musicXML.tie.getType()) {
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

    return new Tie(curveNumber, phase, placement, opening);
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
