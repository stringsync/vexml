import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering an Articulation. */
export type FermataRendering = {
  type: 'fermata';
  vexflow: {
    articulation: vexflow.Articulation;
  };
};

/** Represents a Fermata. */
export class Fermata {
  private musicXML: { fermata: musicxml.Fermata };

  constructor(opts: { musicXML: { fermata: musicxml.Fermata } }) {
    this.musicXML = opts.musicXML;
  }

  render(): FermataRendering {
    // TODO(jared): Make a real fermata.
    return {
      type: 'fermata',
      vexflow: {
        articulation: new vexflow.Articulation('a'),
      },
    };
  }
}
