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
        ornaments: [...this.getTrillMarks(), ...this.getTurns(), ...this.getDelayedTurns(), ...this.getInvertedTurns()],
      },
    };
  }

  private getOrnament(opts: {
    type: string;
    accidentalMarks: musicxml.AccidentalMark[];
    delayed: boolean;
  }): vexflow.Ornament {
    const vfOrnament = new vexflow.Ornament(opts.type).setDelayed(opts.delayed);

    // TODO: Provide a warning when there are more than two accidental marks.

    const [accidental1, accidental2] = opts.accidentalMarks.map((accidentalMark) =>
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
    return this.musicXML.ornaments.getTrillMarks().map((trillMark) =>
      this.getOrnament({
        type: 'tr',
        accidentalMarks: trillMark.accidentalMarks,
        delayed: false,
      })
    );
  }

  private getTurns(): vexflow.Ornament[] {
    return this.musicXML.ornaments.getTurns().map((turn) =>
      this.getOrnament({
        type: 'turn',
        accidentalMarks: turn.accidentalMarks,
        delayed: false,
      })
    );
  }

  private getDelayedTurns(): vexflow.Ornament[] {
    return this.musicXML.ornaments.getDelayedTurns().map((delayedTurn) =>
      this.getOrnament({
        type: 'turn',
        accidentalMarks: delayedTurn.accidentalMarks,
        delayed: true,
      })
    );
  }

  private getInvertedTurns(): vexflow.Ornament[] {
    return this.musicXML.ornaments.getInvertedTurns().map((invertedTurn) =>
      this.getOrnament({
        type: 'turnInverted',
        accidentalMarks: invertedTurn.accidentalMarks,
        delayed: false,
      })
    );
  }
}
