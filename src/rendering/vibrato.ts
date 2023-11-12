import * as vexflow from 'vexflow';
import * as util from '@/util';
import { SpannerFragmentPhase } from './enums';

/** The result of rendering a wavy line. */
export type VibratoRendering = {
  type: 'vibrato';
  vexflow: {
    vibratoBracket: vexflow.VibratoBracket;
  };
};

/** A piece of a wavy line. */
export type VibratoFragment = {
  type: 'vibrato';
  phase: SpannerFragmentPhase;
  keyIndex: number;
  vexflow: {
    note: vexflow.Note;
  };
};

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/
 */
export class Vibrato {
  private fragments: VibratoFragment[];

  constructor(opts: { fragments: VibratoFragment[] }) {
    util.assert(opts.fragments.length >= 2, 'must have at least 2 wavy line fragment');

    this.fragments = opts.fragments;
  }

  render(): VibratoRendering {
    const vfStartNote = util.first(this.fragments)!.vexflow.note;
    const vfEndNote = util.last(this.fragments)!.vexflow.note;

    const vfVibratoBracket = new vexflow.VibratoBracket({
      start: vfStartNote,
      stop: vfEndNote,
    });

    return {
      type: 'vibrato',
      vexflow: {
        vibratoBracket: vfVibratoBracket,
      },
    };
  }
}
