import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering an accent. */
export type AccentRendering = {
  type: 'accent';
  vexflow: {
    articulation: vexflow.Articulation;
  };
};

/** Represents an emphasis, stress, or stronger attack placed on a particular note or set of notes or chord. */
export class Accent {
  private musicXML: { accent: musicxml.Accent };

  constructor(opts: { musicXML: { accent: musicxml.Accent } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the Accent. */
  render(): AccentRendering {
    return {
      type: 'accent',
      vexflow: {
        articulation: this.getVfArticulation(),
      },
    };
  }

  private getVfArticulation(): vexflow.Articulation {
    const placement = this.musicXML.accent.getPlacement();

    switch (placement) {
      case 'above':
        return new vexflow.Articulation('a>').setPosition(vexflow.Modifier.Position.ABOVE);
      case 'below':
        return new vexflow.Articulation('a>').setPosition(vexflow.Modifier.Position.BELOW);
    }
  }
}
