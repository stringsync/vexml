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
        return this.getUprightVfArticulation();
      case 'inverted':
        return this.getInvertedVfArticulation();
    }
  }

  private getUprightVfArticulation(): vexflow.Articulation {
    const shape = this.musicXML.fermata.getShape();

    switch (shape) {
      case 'normal':
        return new vexflow.Articulation('a@a');
      case 'angled':
        return new vexflow.Articulation('a@s');
      case 'square':
        return new vexflow.Articulation('a@l');
      default:
        return new vexflow.Articulation('a@a');
    }
  }

  private getInvertedVfArticulation(): vexflow.Articulation {
    const shape = this.musicXML.fermata.getShape();

    switch (shape) {
      case 'normal':
        return new vexflow.Articulation('a@u').setPosition(vexflow.Modifier.Position.BELOW);
      case 'angled':
        return new vexflow.Articulation('a@us').setPosition(vexflow.Modifier.Position.BELOW);
      case 'square':
        return new vexflow.Articulation('a@ul').setPosition(vexflow.Modifier.Position.BELOW);
      default:
        return new vexflow.Articulation('a@u').setPosition(vexflow.Modifier.Position.BELOW);
    }
  }
}
