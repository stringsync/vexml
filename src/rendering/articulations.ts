import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering Articulations. */
export type ArticulationsRendering = {
  type: 'articulations';
  values: Articulation[];
};

type ArticulationType =
  | 'accent'
  | 'strongaccent'
  | 'staccato'
  | 'tenuto'
  | 'detachedlegato'
  | 'staccatissimo'
  | 'scoop'
  | 'doit'
  | 'falloff'
  | 'breathmark';

type Articulation<T extends ArticulationType = ArticulationType> = {
  type: T;
  vexflow: {
    values: Array<
      | {
          type: 'articulation';
          articulation: vexflow.Articulation;
        }
      | {
          type: 'ornament';
          ornament: vexflow.Ornament;
        }
    >;
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
        ...this.getDetachedLegatos(),
        ...this.getStaccatissimos(),
        ...this.getScoops(),
        ...this.getDoits(),
        ...this.getFalloffs(),
        ...this.getBreathmarks(),
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

      return {
        type: 'accent',
        vexflow: {
          values: [{ type: 'articulation', articulation: vfArticulation }],
        },
      };
    });
  }

  private getStrongAccents(): Articulation<'strongaccent'>[] {
    return this.musicXML.articulations.getStrongAccents().map((strongAccent) => {
      let vfArticulation: vexflow.Articulation;

      switch (strongAccent.placement) {
        case 'above':
          vfArticulation = new vexflow.Articulation('a^');
          break;
        case 'below':
          vfArticulation = new vexflow.Articulation('a^').setPosition(vexflow.Modifier.Position.BELOW);
          break;
        default:
          vfArticulation = new vexflow.Articulation('a^');
      }

      return {
        type: 'strongaccent',
        vexflow: { values: [{ type: 'articulation', articulation: vfArticulation }] },
      };
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

      return {
        type: 'staccato',
        vexflow: {
          values: [{ type: 'articulation', articulation: vfArticulation }],
        },
      };
    });
  }

  private getTenutos(): Articulation<'tenuto'>[] {
    return this.musicXML.articulations.getTenutos().map((tenuto) => {
      const vfArticulation = new vexflow.Articulation('a-');

      if (tenuto.placement === 'below') {
        vfArticulation.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'tenuto',
        vexflow: {
          values: [{ type: 'articulation', articulation: vfArticulation }],
        },
      };
    });
  }

  private getDetachedLegatos(): Articulation<'detachedlegato'>[] {
    return this.musicXML.articulations.getDetachedLegatos().map((detachedLegato) => {
      const vfArticulations = new Array<vexflow.Articulation>();

      switch (detachedLegato.placement) {
        case 'below':
          vfArticulations.push(new vexflow.Articulation('a.').setPosition(vexflow.Modifier.Position.BELOW));
          vfArticulations.push(new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW));
          break;
        default:
          vfArticulations.push(new vexflow.Articulation('a.'));
          vfArticulations.push(new vexflow.Articulation('a-'));
      }

      return {
        type: 'detachedlegato',
        vexflow: {
          values: vfArticulations.map((vfArticulation) => ({ type: 'articulation', articulation: vfArticulation })),
        },
      };
    });
  }

  private getStaccatissimos(): Articulation<'staccatissimo'>[] {
    return this.musicXML.articulations.getStaccatissimos().map((staccatissimo) => {
      const vfArticulation = new vexflow.Articulation('av');

      if (staccatissimo.placement === 'below') {
        vfArticulation.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'staccatissimo',
        vexflow: { values: [{ type: 'articulation', articulation: vfArticulation }] },
      };
    });
  }

  private getScoops(): Articulation<'scoop'>[] {
    return this.musicXML.articulations.getScoops().map((scoop) => {
      const vfOrnament = new vexflow.Ornament('scoop');

      if (scoop.placement === 'below') {
        vfOrnament.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'scoop',
        vexflow: { values: [{ type: 'ornament', ornament: vfOrnament }] },
      };
    });
  }

  private getDoits(): Articulation<'doit'>[] {
    return this.musicXML.articulations.getDoits().map((doit) => {
      const vfOrnament = new vexflow.Ornament('doit');

      if (doit.placement === 'below') {
        vfOrnament.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'doit',
        vexflow: { values: [{ type: 'ornament', ornament: vfOrnament }] },
      };
    });
  }

  private getFalloffs(): Articulation<'falloff'>[] {
    return this.musicXML.articulations.getFalloffs().map((falloff) => {
      const vfOrnament = new vexflow.Ornament('fall');

      if (falloff.placement === 'below') {
        vfOrnament.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'falloff',
        vexflow: { values: [{ type: 'ornament', ornament: vfOrnament }] },
      };
    });
  }

  private getBreathmarks(): Articulation<'breathmark'>[] {
    return this.musicXML.articulations.getBreathMarks().map((breathmark) => {
      const vfArticulation = new vexflow.Articulation('a,');

      if (breathmark.placement === 'below') {
        vfArticulation.setPosition(vexflow.Modifier.Position.BELOW);
      }

      return {
        type: 'breathmark',
        vexflow: { values: [{ type: 'articulation', articulation: vfArticulation }] },
      };
    });
  }
}
