import * as vexflow from 'vexflow';
import { Address } from './address';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';

/** The result of rendering a hammer-on. */
export type HammerOnRendering = {
  type: 'hammeron';
  vexflow: {
    tie: vexflow.StaveTie;
  };
};

/** The types of hammer-on fragments. */
export type HammerOnFragmentType = 'unspecified' | 'start' | 'stop';

/** Represents a piece of a hammer-on. */
export type HammerOnFragment = {
  type: HammerOnFragmentType;
  number: number;
  address: Address;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

/** The container for hammer-ons. */
type HammerOnContainer = SpannerMap<number, HammerOn>;

/** Represents tapping a string location to produce a note for stringed instruments. */
export class HammerOn {
  private fragments: [HammerOnFragment, ...HammerOnFragment[]];

  private constructor(opts: { fragment: HammerOnFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Processes spanner data for hammer-ons. */
  static process(data: SpannerData, container: HammerOnContainer): void {
    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
      return;
    }

    const hammerOns = note
      .getNotations()
      .flatMap((notations) => notations)
      .flatMap((notation) => notation.getTechnicals())
      .flatMap((technical) => technical.getHammerOns());
    for (const hammerOn of hammerOns) {
      HammerOn.commit(
        {
          type: hammerOn.getType() ?? 'unspecified',
          number: hammerOn.getNumber(),
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

  private static commit(fragment: HammerOnFragment, container: HammerOnContainer): void {
    const hammerOn = container.get(fragment.number);
    const last = hammerOn?.getLastFragment();
    const isAllowedType = HammerOn.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new HammerOn({ fragment }));
    } else if (hammerOn && isAllowedType) {
      hammerOn.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: HammerOnFragmentType | undefined): HammerOnFragmentType[] {
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

  /** Renders the hammer-on. */
  render(): HammerOnRendering {
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
    const vfTie = new vexflow.StaveTie(vfTieNotes, 'H').setDirection(vfSlurDirection);

    return {
      type: 'hammeron',
      vexflow: {
        tie: vfTie,
      },
    };
  }

  private getLastFragment(): HammerOnFragment {
    return this.fragments[this.fragments.length - 1];
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
