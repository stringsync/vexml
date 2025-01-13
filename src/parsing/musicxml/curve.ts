import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { VoiceEntryContext } from './contexts';

type CurvePhase = 'start' | 'continue' | 'stop';

/** A generic way of representing a curved connector in music notation. */
export class Curve {
  constructor(
    private curveNumber: number,
    private phase: CurvePhase,
    private placement: data.CurvePlacement,
    private opening: data.CurveOpening,
    private articulation: data.CurveArticulation
  ) {}

  static create(musicXML: { notation: musicxml.Notations }): Curve[] {
    return [...Curve.createSlurs(musicXML), ...Curve.createTies(musicXML)];
  }

  private static createSlurs(musicXML: { notation: musicxml.Notations }): Curve[] {
    const curves = new Array<Curve>();

    for (const slur of musicXML.notation.getSlurs()) {
      const placement = slur.getPlacement() ?? 'auto';

      let phase: CurvePhase;
      switch (slur.getType()) {
        case 'start':
          phase = 'start';
          break;
        default:
          phase = 'continue';
          break;
      }

      let opening: data.CurveOpening = 'auto';
      switch (slur.getOrientation()) {
        // Yes, these translations are correct.
        case 'over':
          opening = 'down';
          break;
        case 'under':
          opening = 'up';
          break;
      }

      let curveNumber = slur.getNumber();
      let articulation: data.CurveArticulation = 'unspecified';

      const slides = musicXML.notation.getSlides();
      const hammerOns = musicXML.notation.getTechnicals().flatMap((t) => t.getHammerOns());
      const pullOffs = musicXML.notation.getTechnicals().flatMap((t) => t.getPullOffs());
      if (slides.length > 0) {
        curveNumber = slides.at(0)?.getNumber() ?? curveNumber;
        articulation = 'slide';
      } else if (hammerOns.length > 0) {
        curveNumber = hammerOns.at(0)?.getNumber() ?? curveNumber;
        articulation = 'hammeron';
      } else if (pullOffs.length > 0) {
        curveNumber = pullOffs.at(0)?.getNumber() ?? curveNumber;
        articulation = 'pulloff';
      }

      curves.push(new Curve(curveNumber, phase, placement, opening, articulation));
    }

    return curves;
  }

  private static createTies(musicXML: { notation: musicxml.Notations }): Curve[] {
    const curves = new Array<Curve>();

    for (const tied of musicXML.notation.getTieds()) {
      const placement = tied.getPlacement() ?? 'auto';

      let phase: CurvePhase;
      switch (tied.getType()) {
        case 'start':
          phase = 'start';
          break;
        default:
          phase = 'continue';
          break;
      }

      let opening: data.CurveOpening = 'auto';
      switch (tied.getOrientation()) {
        // Yes, these translations are correct.
        case 'over':
          opening = 'down';
          break;
        case 'under':
          opening = 'up';
          break;
      }

      const curveNumber = tied.getNumber();
      const articulation = 'unspecified';

      curves.push(new Curve(curveNumber, phase, placement, opening, articulation));
    }

    return curves;
  }

  parse(voiceEntryCtx: VoiceEntryContext): string {
    if (this.phase === 'start') {
      return voiceEntryCtx.beginCurve(this.curveNumber, this.placement, this.opening, this.articulation);
    }
    return (
      voiceEntryCtx.continueCurve(this.curveNumber) ??
      voiceEntryCtx.beginCurve(this.curveNumber, this.placement, this.opening, this.articulation)
    );
  }
}
