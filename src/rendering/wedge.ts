import * as vexflow from 'vexflow';
import * as util from '@/util';

/** The result of rendering a wedge. */
export type WedgeRendering = {
  type: 'wedge';
  vexflow: {
    staveHairpin: vexflow.StaveHairpin;
  };
};

/** A piece of a wedge. */
export type WedgeFragment = StartWedgeFragment | ContinueWedgeFragment | StopWedgeFragment;

type StartWedgeFragment = {
  type: 'start';
  vexflow: {
    note: vexflow.Note;
    position: vexflow.ModifierPosition;
    staveHairpinType: number;
  };
};

type ContinueWedgeFragment = {
  type: 'continue';
  vexflow: {
    note: vexflow.Note;
  };
};

type StopWedgeFragment = {
  type: 'stop';
  vexflow: {
    note: vexflow.Note;
  };
};

/** Represents a crescendo or decrescendo. */
export class Wedge {
  private fragments: [StartWedgeFragment, ...WedgeFragment[]];

  constructor(opts: { fragment: StartWedgeFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Whether the fragment is allowed to be added to the wedge. */
  isAllowed(fragment: WedgeFragment): boolean {
    switch (util.last(this.fragments)!.type) {
      case 'start':
      case 'continue':
        return fragment.type === 'continue' || fragment.type === 'stop';
      case 'stop':
        return false;
    }
  }

  /** Adds the fragment to the wedge. */
  addFragment(fragment: WedgeFragment): void {
    this.fragments.push(fragment);
  }

  render(): WedgeRendering {
    util.assert(this.fragments.length >= 2, 'must have at least two fragments');

    const firstNote = util.first(this.fragments)!.vexflow.note;
    const lastNote = util.last(this.fragments)!.vexflow.note;

    const startWedgeFragment = this.getStartWedgeFragment();

    const vfStaveHairpin = new vexflow.StaveHairpin(
      {
        firstNote,
        lastNote,
      },
      startWedgeFragment.vexflow.staveHairpinType
    ).setPosition(startWedgeFragment.vexflow.position);

    return {
      type: 'wedge',
      vexflow: { staveHairpin: vfStaveHairpin },
    };
  }

  private getStartWedgeFragment(): StartWedgeFragment {
    return this.fragments[0];
  }
}
