import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { SpannerFragmentPhase } from './enums';

/** The result of rendering a pedal. */
export type PedalRendering = {
  type: 'pedal';
  vexflow: {
    pedalMarking: vexflow.PedalMarking;
  };
};

/** A piece of a pedal. */
export type PedalFragment = {
  type: 'pedal';
  phase: SpannerFragmentPhase;
  musicXml: {
    pedal: musicxml.Pedal;
  };
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

/** Represents piano pedal marks. */
export class Pedal {
  private fragments: PedalFragment[];

  constructor(opts: { fragments: PedalFragment[] }) {
    util.assert(opts.fragments.length >= 2, 'must have at least 2 pedal fragments');

    this.fragments = opts.fragments;
  }

  render(): PedalRendering {
    const vfStaveNotes = this.getVfStaveNotes();
    const vfPedalMarking = new vexflow.PedalMarking(vfStaveNotes);

    return {
      type: 'pedal',
      vexflow: {
        pedalMarking: vfPedalMarking,
      },
    };
  }

  private getVfStaveNotes(): vexflow.StaveNote[] {
    const result = new Array<vexflow.StaveNote>();

    return result;
  }
}
