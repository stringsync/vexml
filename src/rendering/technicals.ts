import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

export type TechnicalsRendering = {
  type: 'technicals';
  vexflow: {
    articulations: vexflow.Articulation[];
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
        articulations: [...this.getUpBows(), ...this.getDownBows(), ...this.getHarmonics(), ...this.getOpenStrings()],
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
}
