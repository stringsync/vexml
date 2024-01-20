import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering Articulations. */
export type ArticulationsRendering = {
  type: 'articulations';
  values: Articulation[];
};

type ArticulationType = 'accent' | 'strongaccent' | 'staccato' | 'tenuto' | 'staccatissimo';

type Articulation<T extends ArticulationType = ArticulationType> = {
  type: T;
  vexflow: {
    articulation: vexflow.Articulation;
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
    return {
      type: 'articulations',
      values: [
        ...this.getAccents(),
        ...this.getStrongAccents(),
        ...this.getStaccatos(),
        ...this.getTenutos(),
        ...this.getStaccatissimos(),
      ],
    };
  }

  private getAccents(): Articulation<'accent'>[] {
    return this.musicXML.articulations.getAccents().map((accent) => {
      let vfArticulation: vexflow.Articulation;

      switch (accent.placement) {
        case 'above':
          vfArticulation = new vexflow.Articulation('a>');
          break;
        case 'below':
          vfArticulation = new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
          break;
        default:
          vfArticulation = new vexflow.Articulation('a>');
          break;
      }

      return { type: 'accent', vexflow: { articulation: vfArticulation } };
    });
  }

  private getStrongAccents(): Articulation<'strongaccent'>[] {
    return this.musicXML.articulations.getStrongAccents().map((strongAccent) => {
      let vfArticulation: vexflow.Articulation;

      switch (strongAccent.placement) {
        case 'above':
          vfArticulation = new vexflow.Articulation('a>');
          break;
        case 'below':
          vfArticulation = new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
          break;
        default:
          vfArticulation = new vexflow.Articulation('a>');
      }

      return { type: 'strongaccent', vexflow: { articulation: vfArticulation } };
    });
  }

  private getStaccatos(): Articulation<'staccato'>[] {
    return this.musicXML.articulations.getStaccatos().map((staccato) => {
      let vfArticulation: vexflow.Articulation;

      switch (staccato.placement) {
        case 'above':
          vfArticulation = new vexflow.Articulation('a.');
          break;
        case 'below':
          vfArticulation = new vexflow.Articulation('a.').setPosition(vexflow.Modifier.Position.BELOW);
          break;
        default:
          vfArticulation = new vexflow.Articulation('a.');
      }

      return { type: 'staccato', vexflow: { articulation: vfArticulation } };
    });
  }

  private getTenutos(): Articulation<'tenuto'>[] {
    return this.musicXML.articulations.getTenutos().map((tenuto) => {
      const vfArticulation = new vexflow.Articulation('a-');

      if (tenuto.placement === 'below') {
        vfArticulation.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return { type: 'tenuto', vexflow: { articulation: vfArticulation } };
    });
  }

  private getStaccatissimos(): Articulation<'staccatissimo'>[] {
    return this.musicXML.articulations.getStaccatissimos().map((staccatissimo) => {
      const vfArticulation = new vexflow.Articulation('av');

      if (staccatissimo.placement === 'below') {
        vfArticulation.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return { type: 'staccatissimo', vexflow: { articulation: vfArticulation } };
    });
  }
}
