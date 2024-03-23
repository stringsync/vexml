import * as vexflow from 'vexflow';
import { Address } from './address';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';

/** The result of rendering a pull-off. */
export type PullOffRendering = {
  type: 'pulloff';
  vexflow: {
    tie: vexflow.StaveTie;
  };
};

/** The types of pull-off fragments. */
export type PullOffFragmentType = 'unspecified' | 'start' | 'stop';

/** Represents a piece of a pull-off. */
export type PullOffFragment = {
  type: PullOffFragmentType;
  number: number;
  address: Address;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

/** The container for pull-offs. */
type PullOffContainer = SpannerMap<number, PullOff>;

/** Represents tapping a string location to produce a note for stringed instruments. */
export class PullOff {
  private fragments: [PullOffFragment, ...PullOffFragment[]];

  private constructor(opts: { fragment: PullOffFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Processes spanner data for pull-offs. */
  static process(data: SpannerData, container: PullOffContainer): void {
    if (data.vexflow.type !== 'tabnote') {
      return;
    }

    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
      return;
    }

    const pullOffs = note
      .getNotations()
      .flatMap((notations) => notations)
      .flatMap((notation) => notation.getTechnicals())
      .flatMap((technical) => technical.getPullOffs());
    for (const pullOff of pullOffs) {
      PullOff.commit(
        {
          type: pullOff.getType() ?? 'unspecified',
          number: pullOff.getNumber(),
          address: data.address,
          vexflow: {
            note: data.vexflow.note,
            keyIndex: data.keyIndex,
          },
        },
        container
      );
    }
  }

  private static commit(fragment: PullOffFragment, container: PullOffContainer): void {
    const pullOff = container.get(fragment.number);
    const last = pullOff?.getLastFragment();
    const isAllowedType = PullOff.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new PullOff({ fragment }));
    } else if (pullOff && isAllowedType) {
      pullOff.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: PullOffFragmentType | undefined): PullOffFragmentType[] {
    switch (type) {
      case 'unspecified':
        return ['start'];
      case 'start':
        return ['start', 'stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  /** Renders the pull-off. */
  render(): PullOffRendering {
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

    const vfTie = new vexflow.StaveTie(vfTieNotes, 'P').setDirection(-1);

    return {
      type: 'pulloff',
      vexflow: {
        tie: vfTie,
      },
    };
  }

  private getLastFragment(): PullOffFragment {
    return this.fragments[this.fragments.length - 1];
  }
}
