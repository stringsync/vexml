import * as vexflow from 'vexflow';
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
};

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/
 */
export class WavyLine {
  private fragments: WavyLineFragment[];

  constructor(opts: { fragments: WavyLineFragment[] }) {
    this.fragments = opts.fragments;
  }

  render(): WavyLineRendering {
    const vfOrnaments = this.fragments.map(() => new vexflow.Ornament('prallprall'));

    return {
      type: 'wavyline',
      vexflow: {
        ornaments: vfOrnaments,
      },
    };
  }
}
