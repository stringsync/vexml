import * as vexflow from 'vexflow';
import * as util from '@/util';
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
export type TieFragmentType = 'start' | 'stop' | 'continue' | 'let-ring';

/** Represents a piece of a tie. */
export type TieFragment = {
  type: TieFragmentType;
  number: number;
  address: Address;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

/** The container for ties. */
type TieContainer = SpannerMap<number, Tie>;

/** Represents a curved line that connects two notes of the same pitch. */
export class Tie {
  private fragments: [TieFragment, ...TieFragment[]];

  private constructor(opts: { fragment: TieFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Processes spanner data for ties. */
  static process(data: SpannerData, container: TieContainer): void {
    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
      return;
    }

    const ties = note.getNotations().flatMap((notations) => notations.getTieds());
    for (const tie of ties) {
      const tieType = tie.getType();
      if (!tieType) {
        continue;
      }

      Tie.commit(
        {
          type: tieType,
          number: tie.getNumber(),
          address: data.address,
          vexflow: {
            note: data.vexflow.staveNote,
            keyIndex: data.keyIndex,
          },
        },
        container
      );
    }
  }

  private static commit(fragment: TieFragment, container: TieContainer): void {
    const slur = container.get(fragment.number);
    const last = slur?.getLastFragment();
    const isAllowedType = Tie.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new Tie({ fragment }));
    } else if (slur && isAllowedType) {
      slur.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: TieFragmentType | undefined): TieFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
        return ['continue', 'stop', 'let-ring'];
      case 'let-ring':
        return ['stop'];
      case 'stop':
        return [];
      default:
        return [];
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

  private getLastFragment(): TieFragment {
    return util.last(this.fragments)!;
  }

  private getVfSlurDirection(): number {
    const first = this.fragments[0];
    const vfStemDirection = first.vexflow.note.getStemDirection();

    switch (vfStemDirection) {
      case vexflow.Stem.UP:
        return 1;
      case vexflow.Stem.DOWN:
        return -1;
      default:
        return 1;
    }
  }
}
