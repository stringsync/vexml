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

  /** Renders the Fermata. */
  render(): FermataRendering {
    return {
      type: 'fermata',
      vexflow: {
        articulation: this.getVfArticulation(),
      },
    };
  }

  private getVfArticulation(): vexflow.Articulation {
    const type = this.musicXML.fermata.getType();

    switch (type) {
      case 'upright':
        return new vexflow.Articulation('a@a');
      case 'inverted':
        return new vexflow.Articulation('a@u').setPosition(vexflow.ModifierPosition.BELOW);
    }
  }
}
