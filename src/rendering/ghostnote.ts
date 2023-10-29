import * as vexflow from 'vexflow';
import { NoteDurationDenominator } from './enums';

export type GhostNoteRendering = {
  type: 'ghostnote';
  vexflow: {
    ghostNote: vexflow.GhostNote;
  };
};

export class GhostNote {
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: { durationDenominator: NoteDurationDenominator }) {
    this.durationDenominator = opts.durationDenominator;
  }

  render(): GhostNoteRendering {
    const ghostNote = new vexflow.GhostNote({ duration: this.durationDenominator });

    return {
      type: 'ghostnote',
      vexflow: {
        ghostNote,
      },
    };
  }
}
