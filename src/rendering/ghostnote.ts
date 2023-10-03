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

  private constructor(opts: { durationDenominator: NoteDurationDenominator }) {
    this.durationDenominator = opts.durationDenominator;
  }

  static create(opts: { durationDenominator: NoteDurationDenominator }): GhostNote {
    return new GhostNote({ durationDenominator: opts.durationDenominator });
  }

  clone(): GhostNote {
    return new GhostNote({ durationDenominator: this.durationDenominator });
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
