import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { VoiceEntryContext } from './contexts';
import { Config } from '@/config';
import { Logger } from '@/debug';

type CurvePhase = 'start' | 'continue' | 'stop';

function curvePlacement(element: mdom.MElement): data.CurvePlacement {
  const placement = element.getAttribute('placement');
  return placement === 'above' || placement === 'below' ? placement : 'auto';
}

function curveOpening(element: mdom.MElement): data.CurveOpening {
  // Yes, these translations are correct.
  switch (element.getAttribute('orientation')) {
    case 'over':
      return 'down';
    case 'under':
      return 'up';
    default:
      return 'auto';
  }
}

/** A generic way of representing a curved connector in music notation. */
export class Curve {
  constructor(
    private config: Config,
    private log: Logger,
    private curveNumber: number,
    private phase: CurvePhase,
    private placement: data.CurvePlacement,
    private opening: data.CurveOpening,
    private articulation: data.CurveArticulation
  ) {}

  static create(config: Config, log: Logger, musicXML: { notation: musicxml.Notations }): Curve[] {
    return [...Curve.createSlurs(config, log, musicXML), ...Curve.createTies(config, log, musicXML)];
  }

  /** Builds curves from a single mdom `<notations>` element, mirroring {@link create}. */
  static fromMdom(config: Config, log: Logger, mdom: { notations: mdom.MElement }): Curve[] {
    const notations = mdom.notations;
    const curves = new Array<Curve>();

    for (const slur of notations.childrenNamed('slur')) {
      const phase: CurvePhase = slur.getAttribute('type') === 'start' ? 'start' : 'continue';

      let curveNumber = parseInt(slur.getAttribute('number') ?? '1', 10);
      let articulation: data.CurveArticulation = 'unspecified';

      const slides = notations.childrenNamed('slide');
      const technicals = notations.childrenNamed('technical');
      const hammerOns = technicals.flatMap((t) => t.childrenNamed('hammer-on'));
      const pullOffs = technicals.flatMap((t) => t.childrenNamed('pull-off'));
      if (slides.length > 0) {
        curveNumber = parseInt(slides[0].getAttribute('number') ?? '1', 10);
        articulation = 'slide';
      } else if (hammerOns.length > 0) {
        const number = hammerOns[0].getAttribute('number');
        curveNumber = number !== null ? parseInt(number, 10) : curveNumber;
        articulation = 'hammeron';
      } else if (pullOffs.length > 0) {
        const number = pullOffs[0].getAttribute('number');
        curveNumber = number !== null ? parseInt(number, 10) : curveNumber;
        articulation = 'pulloff';
      }

      curves.push(new Curve(config, log, curveNumber, phase, curvePlacement(slur), curveOpening(slur), articulation));
    }

    for (const tied of notations.childrenNamed('tied')) {
      const phase: CurvePhase = tied.getAttribute('type') === 'start' ? 'start' : 'continue';
      const curveNumber = parseInt(tied.getAttribute('number') ?? '1', 10);
      curves.push(new Curve(config, log, curveNumber, phase, curvePlacement(tied), curveOpening(tied), 'unspecified'));
    }

    return curves;
  }

  private static createSlurs(config: Config, log: Logger, musicXML: { notation: musicxml.Notations }): Curve[] {
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

      curves.push(new Curve(config, log, curveNumber, phase, placement, opening, articulation));
    }

    return curves;
  }

  private static createTies(config: Config, log: Logger, musicXML: { notation: musicxml.Notations }): Curve[] {
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

      curves.push(new Curve(config, log, curveNumber, phase, placement, opening, articulation));
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
