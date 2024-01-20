import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering Articulations. */
export type ArticulationsRendering = {
  type: 'articulation';
  vexflow: {
    articulations: vexflow.Articulation[];
  };
};

/**
 * Articulation in music refers to the direction or performance technique which affects the transition or continuity on
 * a single note, or between multiple notes or sounds.
 */
export class Articulations {
  private musicXML: { articulations: musicxml.Articulations };

  constructor(opts: { musicXML: { articulations: musicxml.Articulations } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the articulations. */
  render(): ArticulationsRendering {
    const vfArticulations = new Array<vexflow.Articulation>();

    vfArticulations.push(...this.getVfAccents());
    vfArticulations.push(...this.getVfStrongAccents());
    vfArticulations.push(...this.getVfStaccatos());

    return {
      type: 'articulation',
      vexflow: {
        articulations: vfArticulations,
      },
    };
  }

  private getVfAccents(): vexflow.Articulation[] {
    return this.musicXML.articulations.getAccents().map((accent) => {
      switch (accent.placement) {
        case 'above':
          return new vexflow.Articulation('a>');
        case 'below':
          return new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a>');
      }
    });
  }

  private getVfStrongAccents(): vexflow.Articulation[] {
    return this.musicXML.articulations.getStrongAccents().map((strongAccent) => {
      switch (strongAccent.placement) {
        case 'above':
          return new vexflow.Articulation('a>');
        case 'below':
          return new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a>');
      }
    });
  }

  private getVfStaccatos(): vexflow.Articulation[] {
    return this.musicXML.articulations.getStaccatos().map((staccato) => {
      switch (staccato.placement) {
        case 'above':
          return new vexflow.Articulation('a.');
        case 'below':
          return new vexflow.Articulation('a.').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a.');
      }
    });
  }
}
