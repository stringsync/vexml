import * as vexflow from 'vexflow';
import { SpannerFragmentPhase } from './enums';

/** The result of rendering a beam. */
export type BeamRendering = {
  type: 'beam';
  vexflow: {
    beam: vexflow.Beam;
  };
};

/** Represents a piece of a beam. */
export type BeamFragment = {
  type: 'beam';
  phase: SpannerFragmentPhase;
  vexflow: {
    stemmableNote: vexflow.StemmableNote;
  };
};

/** Represents a stem connector for a group of notes within a measure. */
export class Beam {
  private fragments: BeamFragment[];

  constructor(opts: { fragments: BeamFragment[] }) {
    this.fragments = opts.fragments;
  }

  /** Renders the beam. */
  render(): BeamRendering {
    const vfStemmableNotes = this.fragments.map((fragment) => fragment.vexflow.stemmableNote);
    const beam = new vexflow.Beam(vfStemmableNotes);

    return {
      type: 'beam',
      vexflow: {
        beam,
      },
    };
  }
}
