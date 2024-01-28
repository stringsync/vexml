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
        articulations: [],
      },
    };
  }
}
