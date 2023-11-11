import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
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
  type: 'wedge';
  phase: 'start';
  vexflow: {
    note: vexflow.Note;
    position: vexflow.ModifierPosition;
    staveHairpinType: number;
  };
};

type ContinueWedgeFragment = {
  type: 'wedge';
  phase: 'continue';
  vexflow: {
    note: vexflow.Note;
  };
};

type StopWedgeFragment = {
  type: 'wedge';
  phase: 'stop';
  vexflow: {
    note: vexflow.Note;
  };
};

/** Represents a crescendo or decrescendo. */
export class Wedge {
  private startFragment: StartWedgeFragment;
  private fragments: WedgeFragment[];

  constructor(opts: { placement: musicxml.AboveBelow; startFragment: StartWedgeFragment; fragments: WedgeFragment[] }) {
    util.assert(opts.fragments.length >= 2, 'must have at least 2 wedge fragments');

    this.startFragment = opts.startFragment;
    this.fragments = opts.fragments;
  }

  render(): WedgeRendering {
    const firstNote = util.first(this.fragments)!.vexflow.note;
    const lastNote = util.last(this.fragments)!.vexflow.note;

    const vfStaveHairpin = new vexflow.StaveHairpin(
      { first_note: firstNote, last_note: lastNote },
      this.startFragment.vexflow.staveHairpinType
    ).setPosition(this.startFragment.vexflow.position);

    return {
      type: 'wedge',
      vexflow: { staveHairpin: vfStaveHairpin },
    };
  }
}
