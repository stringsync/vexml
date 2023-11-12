import * as vexflow from 'vexflow';

/** The result of rendering a wavy line. */
export type WavyLineRendering = {
  type: 'wavyline';
  vexflow: {
    ornaments: vexflow.Ornament[];
  };
};

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/
 */
export class WavyLine {
  render(): WavyLineRendering {
    return {
      type: 'wavyline',
      vexflow: {
        ornaments: [],
      },
    };
  }
}
