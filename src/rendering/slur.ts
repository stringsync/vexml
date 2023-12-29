import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as conversions from './conversions';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';
import { Address } from './address';

/** The result of rendering a slur. */
export type SlurRendering = {
  type: 'slur';
  vexflow: {
    tie: vexflow.StaveTie;
  };
};

/** The types of slur fragments. */
export type SlurFragmentType = 'start' | 'continue' | 'stop';

/** Represents a piece of a slur. */
export type SlurFragment = {
  type: SlurFragmentType;
  number: number;
  address: Address;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

/** The container for slurs. */
type SlurContainer = SpannerMap<number, Slur>;

/** Represents a curved line that connects two or more different notes of varying pitch to indicate that they should be
 * played legato.
 */
export class Slur {
  private fragments: [SlurFragment, ...SlurFragment[]];

  private constructor(opts: { fragment: SlurFragment }) {
    this.fragments = [opts.fragment];
  }

  static process(data: SpannerData, container: SlurContainer): void {
    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    if (!note || isRest) {
      return;
    }

    const slurs = note.getNotations().flatMap((notations) => notations.getSlurs());
    for (const slur of slurs) {
      const slurType = slur.getType();
      if (!slurType) {
        continue;
      }

      Slur.commit(
        {
          type: slurType,
          number: slur.getNumber(),
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

  private static commit(fragment: SlurFragment, container: SlurContainer): void {
    const slur = container.get(fragment.number);
    const last = slur?.getLastFragment();
    const isAllowedType = Slur.getAllowedType(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new Slur({ fragment }));
    } else if (slur && isAllowedType) {
      slur.fragments.push(fragment);
    }
  }

  private static getAllowedType(type: SlurFragmentType | undefined): SlurFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
        return ['continue', 'stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
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

    const vfSlurDirection = this.getVfSlurDirection();
    const vfTie = new vexflow.StaveTie(vfTieNotes).setDirection(vfSlurDirection);

    return {
      type: 'slur',
      vexflow: {
        tie: vfTie,
      },
    };
  }

  private getLastFragment(): SlurFragment {
    return util.last(this.fragments)!;
  }

  private getVfSlurDirection(): number {
    const slurPlacement = this.getSlurPlacement();
    return conversions.fromAboveBelowToVexflowSlurDirection(slurPlacement);
  }

  private getSlurPlacement(): musicxml.AboveBelow {
    const vfNote = util.first(this.fragments)?.vexflow.note;
    if (!vfNote) {
      return 'above';
    }

    // If the note has a stem, first try the opposite direction.
    switch (this.getStem(vfNote)) {
      case 'up':
        return 'below';
      case 'down':
        return 'above';
    }

    // Otherwise, use the note's placement relative to its stave to determine placement.
    const line = util.first(vfNote.getKeyProps())?.line ?? null;
    const numLines = vfNote.getStave()?.getNumLines() ?? 5;

    if (typeof line !== 'number') {
      return 'above';
    }

    if (line > numLines / 2) {
      // The note is above the halfway point on the stave.
      return 'below';
    } else {
      // The note is at or below the halfway point on the stave.
      return 'above';
    }
  }

  private getStem(vfNote: vexflow.Note): musicxml.Stem {
    // Calling getStemDirection will throw if there is no stem.
    // https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/src/stemmablenote.ts#L118
    try {
      const stemDirection = vfNote.getStemDirection();
      return conversions.fromVexflowStemDirectionToMusicXMLStem(stemDirection);
    } catch (e) {
      return 'none';
    }
  }
}
