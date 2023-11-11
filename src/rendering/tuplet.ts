import * as vexflow from 'vexflow';
import * as util from '@/util';

/** The result of rendering a tuplet. */
export type TupletRendering = {
  type: 'tuplet';
  vexflow: {
    tuplet: vexflow.Tuplet;
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
      phase: 'unspecified' | 'stop';
      vexflow: {
        note: vexflow.Note;
      };
    };

/** Represents a time modification for a group of notes within a measure. */
export class Tuplet {
  private fragments: TupletFragment[];

  constructor(opts: { fragments: TupletFragment[] }) {
    this.fragments = opts.fragments;
  }

  /** Renders a tuplet. */
  render(): TupletRendering {
    const vfTupletLocation = this.getVfTupletLocation();
    const vfNotes = this.fragments.map((fragment) => fragment.vexflow.note);
    const vfTuplet = new vexflow.Tuplet(vfNotes, { location: vfTupletLocation });

    return {
      type: 'tuplet',
      vexflow: {
        tuplet: vfTuplet,
      },
    };
  }

  private getVfTupletLocation(): vexflow.TupletLocation | undefined {
    const fragment = util.first(this.fragments);
    if (!fragment) {
      return undefined;
    }

    if (fragment.phase !== 'start') {
      return undefined;
    }

    return fragment.vexflow.location;
  }
}