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
      type: 'start';
      vexflow: {
        note: vexflow.Note;
        location: vexflow.TupletLocation;
      };
    }
  | {
      type: 'unspecified' | 'stop';
      vexflow: {
        note: vexflow.Note;
      };
    };

/** Represents a time modification for a group of notes within a measure. */
export class Tuplet {
  private fragments: [TupletFragment, ...TupletFragment[]];

  constructor(opts: { fragment: TupletFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Whether the fragment is allowed to be added to the tuplet. */
  isAllowed(fragment: TupletFragment): boolean {
    switch (util.last(this.fragments)!.type) {
      case 'start':
      case 'unspecified':
        return fragment.type === 'unspecified' || fragment.type === 'stop';
      case 'stop':
        return false;
    }
  }

  /** Adds the fragment to the tuplet. */
  addFragment(fragment: TupletFragment): void {
    this.fragments.push(fragment);
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

    if (fragment.type !== 'start') {
      return undefined;
    }

    return fragment.vexflow.location;
  }
}
