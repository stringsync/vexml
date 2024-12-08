import * as vexflow from 'vexflow';
import { NoteDurationDenominator } from './enums';
import { Address } from './address';

export type GhostNoteRendering = {
  type: 'ghostnote';
  address: Address;
  vexflow: {
    ghostNote: vexflow.GhostNote;
  };
};

export class GhostNote {
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: { durationDenominator: NoteDurationDenominator }) {
    this.durationDenominator = opts.durationDenominator;
  }

  render(opts: { address: Address<'voice'> }): GhostNoteRendering {
    const ghostNote = new vexflow.GhostNote({ duration: this.durationDenominator });

    return {
      type: 'ghostnote',
      address: opts.address,
      vexflow: {
        ghostNote,
      },
    };
  }
}
