import * as vexflow from 'vexflow';
import { NoteDurationDenominator } from './enums';

export type GhostNoteRendering = {
  type: 'ghostnote';
  vexflow: {
    ghostNote: vexflow.GhostNote;
  };
};

export class GhostNote {
  private duration: NoteDurationDenominator;

  private constructor(opts: { duration: NoteDurationDenominator }) {
    this.duration = opts.duration;
  }

  static create(opts: { duration: NoteDurationDenominator }): GhostNote {
    return new GhostNote({ duration: opts.duration });
  }

  clone(): GhostNote {
    return new GhostNote({ duration: this.duration });
  }

  render(): GhostNoteRendering {
    const ghostNote = new vexflow.GhostNote({ duration: this.duration });

    return {
      type: 'ghostnote',
      vexflow: {
        ghostNote,
      },
    };
  }
}
