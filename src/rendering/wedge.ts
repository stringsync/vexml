import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Address } from './address';

/** The result of rendering a wedge. */
export type WedgeRendering = {
  type: 'wedge';
  vexflow: {
    staveHairpin: vexflow.StaveHairpin;
  };
};

/** A piece of a wedge. */
export type WedgeFragment = StartWedgeFragment | ContinueWedgeFragment | StopWedgeFragment;

/** A `WedgeFragment` with metadata. */
export type WedgeEntry = {
  address: Address<'system'>;
  fragment: WedgeFragment;
};

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
  private vexflow: {
    staveHairpinType: number;
    position: vexflow.ModifierPosition;
  };
  private entries: WedgeEntry[];

  constructor(opts: {
    vexflow: {
      staveHairpinType: number;
      position: vexflow.ModifierPosition;
    };
    entries: WedgeEntry[];
  }) {
    util.assert(opts.entries.length >= 2, 'must have at least 2 wedge fragments');

    this.vexflow = opts.vexflow;
    this.entries = opts.entries;
  }

  render(): WedgeRendering {
    const firstNote = util.first(this.entries)!.fragment.vexflow.note;
    const lastNote = util.last(this.entries)!.fragment.vexflow.note;

    const vfStaveHairpin = new vexflow.StaveHairpin(
      {
        firstNote,
        lastNote,
      },
      this.vexflow.staveHairpinType
    ).setPosition(this.vexflow.position);

    return {
      type: 'wedge',
      vexflow: { staveHairpin: vfStaveHairpin },
    };
  }
}
