import * as vexflow from 'vexflow';
import { SlurFragment } from './types';

/** The result of rendering a slur. */
export type SlurRendering = {
  type: 'slur';
  vexflow: {
    tie: vexflow.StaveTie;
  };
};

/** Represents a curved line that connects two or more different notes of varying pitch to indicate that they should be
 * played legato.
 */
export class Slur {
  private fragments: SlurFragment[];

  constructor(opts: { fragments: SlurFragment[] }) {
    this.fragments = opts.fragments;
  }

  /** Renders the slur. */
  render(): SlurRendering {
    const vfTieNotes: vexflow.TieNotes = {};

    for (let index = 0; index < this.fragments.length; index++) {
      const fragment = this.fragments[index];
      const isFirst = index === 0;
      const isLast = index === this.fragments.length - 1;

      // Iterating is not necessary, but it is cleaner than dealing with nulls.
      if (isFirst) {
        vfTieNotes.firstNote = fragment.vexflow.note;
        vfTieNotes.firstIndexes = [fragment.vexflow.keyIndex];
      }
      if (isLast) {
        vfTieNotes.lastNote = fragment.vexflow.note;
        vfTieNotes.lastIndexes = [fragment.vexflow.keyIndex];
      }
    }

    const vfTie = new vexflow.StaveTie(vfTieNotes);

    return {
      type: 'slur',
      vexflow: {
        tie: vfTie,
      },
    };
  }
}
