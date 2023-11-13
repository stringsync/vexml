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
    const vfPedalMarkingType = this.getVfPedalMarkingType();
    const vfPedalMarking = new vexflow.PedalMarking(vfStaveNotes).setType(vfPedalMarkingType);

    return {
      type: 'pedal',
      vexflow: {
        pedalMarking: vfPedalMarking,
      },
    };
  }

  private getVfStaveNotes(): vexflow.StaveNote[] {
    const result = new Array<vexflow.StaveNote>();

    for (const fragment of this.fragments) {
      switch (fragment.musicXml.pedal.getType()) {
        case 'change':
          // This is required for vexflow to show pedal changes.
          result.push(fragment.vexflow.staveNote, fragment.vexflow.staveNote);
          break;
        default:
          result.push(fragment.vexflow.staveNote);
          break;
      }
    }

    return result;
  }

  private getVfPedalMarkingType(): number {
    const fragment = util.first(this.fragments)!;

    const sign = fragment.musicXml.pedal.sign();
    const line = fragment.musicXml.pedal.line();

    if (line && sign) {
      return vexflow.PedalMarking.type.MIXED;
    } else if (line) {
      return vexflow.PedalMarking.type.BRACKET;
    } else if (sign) {
      return vexflow.PedalMarking.type.TEXT;
    } else {
      return vexflow.PedalMarking.type.BRACKET;
    }
  }
}
