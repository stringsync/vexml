import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering an Arpeggio. */
export type ArpeggioRendering = {
  type: 'arpeggio';
  vexflow: {
    stroke: vexflow.Stroke;
  };
};

/**
 * An arpeggio is a type of broken chord in which the notes that compose a chord are individually sounded in a
 * progressive rising or descending order.
 */
export class Arpeggio {
  private musicXML: { notations: musicxml.Notations };

  constructor(opts: { musicXML: { notations: musicxml.Notations } }) {
    this.musicXML = opts.musicXML;
  }

  /** Renders the Arpeggio. */
  render(): ArpeggioRendering {
    return {
      type: 'arpeggio',
      vexflow: {
        stroke: this.getVfStroke(),
      },
    };
  }

  private getVfStroke(): vexflow.Stroke {
    const direction = this.musicXML.notations.getArpeggioDirection();

    switch (direction) {
      case 'up':
        // Yes, ROLL_DOWN is correct.
        return new vexflow.Stroke(vexflow.Stroke.Type.ROLL_DOWN);
      case 'down':
        // Yes, ROLL_UP is correct.
        return new vexflow.Stroke(vexflow.Stroke.Type.ROLL_UP);
      default:
        return new vexflow.Stroke(vexflow.Stroke.Type.ARPEGGIO_DIRECTIONLESS);
    }
  }
}
