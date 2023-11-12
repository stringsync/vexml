import * as vexflow from 'vexflow';
import * as util from '@/util';
import { SpannerFragmentPhase } from './enums';

/** The result of rendering a wavy line. */
export type WavyLineRendering = {
  type: 'wavyline';
  vexflow: {
    ornaments: vexflow.Ornament[];
  };
};

/** A piece of a wavy line. */
export type WavyLineFragment = {
  type: 'wavyline';
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
export class WavyLine {
  private fragments: WavyLineFragment[];

  constructor(opts: { fragments: WavyLineFragment[] }) {
    util.assert(opts.fragments.length >= 1, 'must have at least 1 wavy line fragment');

    this.fragments = opts.fragments;
  }

  render(): WavyLineRendering {
    const vfOrnaments = new Array<vexflow.Ornament>();

    for (const fragment of this.fragments) {
      const vfOrnament = new vexflow.Ornament('prallprall');
      fragment.vexflow.note.addModifier(vfOrnament, fragment.keyIndex);
      vfOrnaments.push(vfOrnament);
    }

    return {
      type: 'wavyline',
      vexflow: {
        ornaments: vfOrnaments,
      },
    };
  }
}
