import { Config } from '@/config';
import * as debug from '@/debug';
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
  private config: Config;
  private log: debug.Logger;
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: { config: Config; log: debug.Logger; durationDenominator: NoteDurationDenominator }) {
    this.config = opts.config;
    this.log = opts.log;
    this.durationDenominator = opts.durationDenominator;
  }

  render(opts: { address: Address<'voice'> }): GhostNoteRendering {
    this.log.debug('rendering ghost note');

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
