import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';

const BEND_WIDTH = 32;

/** The result of rendering all technicals. */
export type TechnicalsRendering = {
  type: 'technicals';
  vexflow: {
    modifiers: vexflow.Modifier[];
  };
};

/**
 * Performance information for specific instruments.
 *
 * A single `<technical>` element may contain multiple technicals to render.
 */
export class Technicals {
  private musicXML: { technical: musicxml.Technical };

  constructor(opts: { musicXML: { technical: musicxml.Technical } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the technicals. */
  render(): TechnicalsRendering {
    return {
      type: 'technicals',
      vexflow: {
        modifiers: [
          ...this.getUpBows(),
          ...this.getDownBows(),
          ...this.getHarmonics(),
          ...this.getOpenStrings(),
          ...this.getFingerings(),
          ...this.getPlucks(),
          ...this.getDoubleTongues(),
          ...this.getTripleTongues(),
          ...this.getStopped(),
          ...this.getSnapPizzicatos(),
          ...this.getFrets(),
          ...this.getStrings(),
          ...this.getBends(),
          ...this.getTaps(),
        ],
      },
    };
  }

  private getUpBows(): vexflow.Articulation[] {
    return this.musicXML.technical.getUpBows().map(() => new vexflow.Articulation('a|'));
  }

  private getDownBows(): vexflow.Articulation[] {
    return this.musicXML.technical.getDownBows().map(() => new vexflow.Articulation('am'));
  }

  private getHarmonics(): vexflow.Articulation[] {
    // TODO: Support other types of harmonics when they are supported by VexFlow.
    return this.musicXML.technical.getHarmonics().map(() => new vexflow.Articulation('ah'));
  }

  private getOpenStrings(): vexflow.Articulation[] {
    return this.musicXML.technical.getOpenStrings().map(() => new vexflow.Articulation('ah'));
  }

  private getFingerings(): vexflow.Annotation[] {
    return this.musicXML.technical
      .getFingerings()
      .map((fingering) => fingering.getNumber())
      .filter((x): x is number => typeof x === 'number')
      .map((number) => new vexflow.Annotation(number.toString()));
  }

  private getPlucks(): vexflow.Annotation[] {
    return this.musicXML.technical
      .getPlucks()
      .map((pluck) => pluck.getFinger())
      .filter((finger): finger is string => typeof finger === 'string')
      .map((finger) => new vexflow.Annotation(finger));
  }

  private getDoubleTongues(): vexflow.Annotation[] {
    return this.musicXML.technical.getDoubleTongues().map(() => new vexflow.Annotation('..'));
  }

  private getTripleTongues(): vexflow.Annotation[] {
    return this.musicXML.technical.getTripleTongues().map(() => new vexflow.Annotation('...'));
  }

  private getStopped(): vexflow.Articulation[] {
    return this.musicXML.technical.getStopped().map(() => new vexflow.Articulation('a+'));
  }

  private getSnapPizzicatos(): vexflow.Articulation[] {
    return this.musicXML.technical.getSnapPizzicatos().map(() => new vexflow.Articulation('ao'));
  }

  private getFrets(): vexflow.StringNumber[] {
    return this.musicXML.technical
      .getFrets()
      .map((fret) => fret.getNumber())
      .filter((x): x is number => typeof x === 'number')
      .map((number) =>
        new vexflow.StringNumber(number.toString()).setPosition(vexflow.Modifier.Position.LEFT).setDrawCircle(false)
      );
  }

  private getStrings(): vexflow.StringNumber[] {
    return this.musicXML.technical
      .getTabStrings()
      .map((string) => string.getNumber())
      .filter((x): x is number => typeof x === 'number')
      .map((number) => new vexflow.StringNumber(number.toString()).setPosition(vexflow.Modifier.Position.RIGHT));
  }

  private getBends(): vexflow.Bend[] {
    const phrase = this.musicXML.technical.getBends().map<vexflow.BendPhrase>((bend) => {
      const semitones = bend.getAlter();

      let text = '';
      if (semitones === 2) {
        text = 'full';
      } else if (semitones === 1) {
        text = '1/2';
      } else if (semitones === 0.5) {
        text = '1/4';
      } else {
        const fraction = util.Fraction.fromDecimal(semitones).toMixed();
        text = `${fraction.whole} ${fraction.remainder.numerator}/${fraction.remainder.denominator}`;
      }

      let type: number;
      switch (bend.getType()) {
        case 'release':
          type = vexflow.Bend.DOWN;
          break;
        default:
          type = vexflow.Bend.UP;
          break;
      }

      return { text, type, width: BEND_WIDTH, drawWidth: BEND_WIDTH };
    });

    return phrase.length > 0 ? [new vexflow.Bend(phrase)] : [];
  }

  private getTaps(): vexflow.Annotation[] {
    return this.musicXML.technical.getTaps().map((tap) => new vexflow.Annotation(tap.getSymbol()));
  }
}
