import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';

/** The result of rendering an ornament. */
export type OrnamentsRendering = {
  type: 'ornaments';
  vexflow: {
    ornaments: vexflow.Ornament[];
  };
};

/** Represents multiple note ornaments. */
export class Ornaments {
  private musicXML: { ornaments: musicxml.Ornaments };

  constructor(opts: { musicXML: { ornaments: musicxml.Ornaments } }) {
    this.musicXML = opts.musicXML;
  }

  render(): OrnamentsRendering {
    return {
      type: 'ornaments',
      vexflow: {
        ornaments: [...this.getTrillMarks()],
      },
    };
  }

  private getOrnament(type: string, accidentalMarks: musicxml.AccidentalMark[]): vexflow.Ornament {
    const vfOrnament = new vexflow.Ornament(type);

    // TODO: Provide a warning when there are more than two accidental marks.

    const [accidental1, accidental2] = accidentalMarks.map((accidentalMark) =>
      conversions.fromAccidentalTypeToAccidentalCode(accidentalMark.getType())
    );
    if (accidental1) {
      vfOrnament.setUpperAccidental(accidental1);
    }
    if (accidental2) {
      vfOrnament.setLowerAccidental(accidental2);
    }

    return vfOrnament;
  }

  private getTrillMarks(): vexflow.Ornament[] {
    return this.musicXML.ornaments
      .getTrillMarks()
      .map((trillMark) => this.getOrnament('tr', trillMark.accidentalMarks));
  }
}
