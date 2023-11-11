import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';

/** The result of rendering a wedge. */
export type WedgeRendering = {
  type: 'wedge';
  vexflow: {
    staveHairpin: vexflow.StaveHairpin;
  };
};

/** A piece of a wedge. */
export type WedgeFragment =
  | {
      type: 'wedge';
      phase: 'start';
      vexflow: {
        note: vexflow.Note;
        position: vexflow.ModifierPosition;
        dynamicType: number;
      };
    }
  | {
      type: 'wedge';
      phase: 'continue' | 'stop';
      vexflow: {
        note: vexflow.Note;
      };
    };

/** Represents a crescendo or decrescendo. */
export class Wedge {
  private placement: musicxml.AboveBelow;
  private fragments: WedgeFragment[];

  constructor(opts: { placement: musicxml.AboveBelow; fragments: WedgeFragment[] }) {
    this.placement = opts.placement;
    this.fragments = opts.fragments;
  }

  render(): WedgeRendering {
    return {
      type: 'wedge',
      vexflow: {
        // TODO: Figure out how to render crescendos: https://github.com/stringsync/vexml/pull/162#issuecomment-1800602187
        staveHairpin: undefined as any,
      },
    };
  }
}
