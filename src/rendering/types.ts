import * as vexflow from 'vexflow';

/** Describes what part of the spanner lifecycle a spanner fragment is in. */
export type SpannerFragmentPhase = 'start' | 'continue' | 'stop';

/**
 * Represents a piece of a spanner.
 *
 * Spanners are structures that involve groups of notes.
 *
 * Examples:
 *   - beams
 *   - tuplets
 *   - slurs
 */
export type SpannerFragment = BeamFragment | TupletFragment | SlurFragment;

/** Represents a piece of a beam. */
export type BeamFragment = {
  type: 'beam';
  phase: SpannerFragmentPhase;
  vexflow: {
    stemmableNote: vexflow.StemmableNote;
  };
};

/** Represents a piece of a tuplet. */
export type TupletFragment =
  | {
      type: 'tuplet';
      phase: 'start';
      vexflow: {
        note: vexflow.Note;
        location: vexflow.TupletLocation;
      };
    }
  | {
      type: 'tuplet';
      phase: 'continue' | 'stop';
      vexflow: {
        note: vexflow.Note;
      };
    };

/** Represents a piece of a slur. */
export type SlurFragment = {
  type: 'slur';
  phase: SpannerFragmentPhase;
  slurNumber: number;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};
