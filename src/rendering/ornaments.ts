import { Config } from '@/config';
import * as debug from '@/debug';
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
  private config: Config;
  private log: debug.Logger;
  private musicXML: { ornaments: musicxml.Ornaments };

  constructor(opts: { config: Config; log: debug.Logger; musicXML: { ornaments: musicxml.Ornaments } }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  render(): OrnamentsRendering {
    this.log.debug('rendering ornaments');

    return {
      type: 'ornaments',
      vexflow: {
        ornaments: [
          ...this.getTrillMarks(),
          ...this.getTurns(),
          ...this.getDelayedTurns(),
          ...this.getInvertedTurns(),
          ...this.getMordents(),
          ...this.getInvertedMordents(),
        ],
      },
    };
  }

  private getOrnament(opts: {
    type: string;
    accidentalMarks: musicxml.AccidentalMark[];
    delayed: boolean;
  }): vexflow.Ornament {
    const vfOrnament = new vexflow.Ornament(opts.type).setDelayed(opts.delayed);

    if (opts.accidentalMarks.length > 2) {
      this.log.warn('only the first two accidental marks are supported for ornaments, ignoring the excess');
    }

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

  private getMordents(): vexflow.Ornament[] {
    return this.musicXML.ornaments.getMordents().map((mordent) =>
      this.getOrnament({
        type: 'mordent',
        accidentalMarks: mordent.accidentalMarks,
        delayed: false,
      })
    );
  }

  private getInvertedMordents(): vexflow.Ornament[] {
    return this.musicXML.ornaments.getInvertedMordents().map((invertedMordent) =>
      this.getOrnament({
        type: 'mordentInverted',
        accidentalMarks: invertedMordent.accidentalMarks,
        delayed: false,
      })
    );
  }
}
