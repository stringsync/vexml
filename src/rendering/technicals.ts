import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

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
}
