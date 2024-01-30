import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering Articulations. */
export type ArticulationsRendering = {
  type: 'articulations';
  vexflow: {
    modifiers: vexflow.Modifier[];
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
      vexflow: {
        modifiers: [
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
      },
    };
  }

  private getAccents(): vexflow.Modifier[] {
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

  private getStrongAccents(): vexflow.Modifier[] {
    return this.musicXML.articulations.getStrongAccents().map((strongAccent) => {
      switch (strongAccent.placement) {
        case 'above':
          return new vexflow.Articulation('a^');
        case 'below':
          return new vexflow.Articulation('a^').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a^');
      }
    });
  }

  private getStaccatos(): vexflow.Modifier[] {
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

  private getTenutos(): vexflow.Modifier[] {
    return this.musicXML.articulations.getTenutos().map((tenuto) => {
      switch (tenuto.placement) {
        case 'above':
          return new vexflow.Articulation('a-');
        case 'below':
          return new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a-');
      }
    });
  }

  private getDetachedLegatos(): vexflow.Modifier[] {
    return this.musicXML.articulations.getDetachedLegatos().flatMap((detachedLegato) => {
      switch (detachedLegato.placement) {
        case 'below':
          return [
            new vexflow.Articulation('a.').setPosition(vexflow.Modifier.Position.BELOW),
            new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW),
          ];
        default:
          return [new vexflow.Articulation('a.'), new vexflow.Articulation('a-')];
      }
    });
  }

  private getStaccatissimos(): vexflow.Modifier[] {
    return this.musicXML.articulations.getStaccatissimos().map((staccatissimo) => {
      switch (staccatissimo.placement) {
        case 'above':
          return new vexflow.Articulation('av');
        case 'below':
          return new vexflow.Articulation('av').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('av');
      }
    });
  }

  private getScoops(): vexflow.Modifier[] {
    return this.musicXML.articulations.getScoops().map((scoop) => {
      switch (scoop.placement) {
        case 'above':
          return new vexflow.Ornament('scoop');
        case 'below':
          return new vexflow.Ornament('scoop').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Ornament('scoop');
      }
    });
  }

  private getDoits(): vexflow.Modifier[] {
    return this.musicXML.articulations.getDoits().map((doit) => {
      switch (doit.placement) {
        case 'above':
          return new vexflow.Ornament('doit');
        case 'below':
          return new vexflow.Ornament('doit').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Ornament('doit');
      }
    });
  }

  private getFalloffs(): vexflow.Modifier[] {
    return this.musicXML.articulations.getFalloffs().map((falloff) => {
      switch (falloff.placement) {
        case 'above':
          return new vexflow.Ornament('fall');
        case 'below':
          return new vexflow.Ornament('fall').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Ornament('fall');
      }
    });
  }

  private getBreathmarks(): vexflow.Modifier[] {
    return this.musicXML.articulations.getBreathMarks().map((breathmark) => {
      switch (breathmark.placement) {
        case 'above':
          return new vexflow.Articulation('a>');
        case 'below':
          return new vexflow.Articulation('a-').setPosition(vexflow.Modifier.Position.BELOW);
        default:
          return new vexflow.Articulation('a>');
      }
    });
  }
}
