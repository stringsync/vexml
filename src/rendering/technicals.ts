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
}
