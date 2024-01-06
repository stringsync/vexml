import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Address } from './address';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';

/** The result of rendering a tie. */
export type TieRendering = {
  type: 'tie';
  vexflow: {
    tie: vexflow.StaveTie;
  };
};

/** The types of tie fragments. */
export type TieFragmentType = 'start' | 'stop';

/** Represents a piece of a tie. */
export type TieFragment = {
  type: TieFragmentType;
  address: Address;
  musicXML: {
    note: musicxml.Note;
  };
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

/** The container for ties. */
type TieContainer = SpannerMap<null, Tie>;

/** Represents a curved line that connects two notes of the same pitch. */
export class Tie {
  private fragments: [TieFragment, ...TieFragment[]];

  private constructor(opts: { fragment: TieFragment }) {
    this.fragments = [opts.fragment];
  }

  static process(data: SpannerData, container: TieContainer): void {
    // TODO(jared): Implement tie processing after musicxml.Note exposes tie information.
  }

  private static commit(fragment: TieFragment, container: TieContainer): void {
    switch (fragment.type) {
      case 'start':
        container.push(null, new Tie({ fragment }));
        break;
      case 'stop':
        container.get(null)?.fragments.push(fragment);
        break;
    }
  }

  /** Renders the tie. */
  render(): TieRendering {
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

    const vfSlurDirection = this.getVfSlurDirection();
    const vfTie = new vexflow.StaveTie(vfTieNotes).setDirection(vfSlurDirection);

    return {
      type: 'tie',
      vexflow: {
        tie: vfTie,
      },
    };
  }

  private getVfSlurDirection(): number {
    const first = this.fragments[0];
    const vfStemDirection = first.vexflow.note.getStemDirection();

    switch (vfStemDirection) {
      case vexflow.Stem.UP:
        return -1;
      case vexflow.Stem.DOWN:
        return 1;
      default:
        return 1;
    }
  }
}
