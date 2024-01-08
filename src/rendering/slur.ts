import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as conversions from './conversions';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';
import { Address } from './address';

const SLUR_PADDING_PER_NOTE = 10;

/** The result of rendering a slur. */
export type SlurRendering = {
  type: 'slur';
  vexflow: {
    curve: vexflow.Curve;
  };
};

/** The types of slur fragments. */
export type SlurFragmentType = 'start' | 'continue' | 'stop';

/** Represents a piece of a slur. */
export type SlurFragment = {
  type: SlurFragmentType;
  number: number;
  address: Address;
  musicXML: {
    slur: musicxml.Slur;
  };
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
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
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
          musicXML: { slur },
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
    const isAllowedType = Slur.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new Slur({ fragment }));
    } else if (slur && isAllowedType) {
      slur.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: SlurFragmentType | undefined): SlurFragmentType[] {
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

  getExtraMeasureFragmentWidth(address: Address<'measurefragment'>): number {
    return (
      this.fragments.filter((fragment) => fragment.address.isMemberOf('measurefragment', address)).length *
      SLUR_PADDING_PER_NOTE
    );
  }

  /** Renders the slur. */
  render(): SlurRendering {
    const vfStartNote = util.first(this.fragments)!.vexflow.note;
    const vfStopNote = util.last(this.fragments)!.vexflow.note;

    const vfCurveOptions = this.getVfCurveOptions(vfStartNote, vfStopNote);

    const vfCurve = new vexflow.Curve(vfStartNote, vfStopNote, vfCurveOptions);

    return {
      type: 'slur',
      vexflow: {
        curve: vfCurve,
      },
    };
  }

  private getLastFragment(): SlurFragment {
    return util.last(this.fragments)!;
  }

  private getVfCurveOptions(vfStartNote: vexflow.Note, vfStopNote: vexflow.Note): vexflow.CurveOptions {
    const startStem = this.getStem(vfStartNote);
    const stopStem = this.getStem(vfStopNote);

    let vfStartPosition: vexflow.CurvePosition | undefined = undefined;
    let vfStopPosition: vexflow.CurvePosition | undefined = undefined;

    switch (this.getSlurPlacement()) {
      case 'above':
        if (startStem === 'up') {
          vfStartPosition = vexflow.CurvePosition.NEAR_TOP;
        } else if (startStem === 'down') {
          vfStartPosition = vexflow.CurvePosition.NEAR_HEAD;
        }

        if (stopStem === 'up') {
          vfStopPosition = vexflow.CurvePosition.NEAR_TOP;
        } else if (stopStem === 'down') {
          vfStopPosition = vexflow.CurvePosition.NEAR_HEAD;
        }
        break;

      case 'below':
        if (startStem === 'up') {
          vfStartPosition = vexflow.CurvePosition.NEAR_HEAD;
        } else if (startStem === 'down') {
          vfStartPosition = vexflow.CurvePosition.NEAR_TOP;
        }

        if (stopStem === 'up') {
          vfStopPosition = vexflow.CurvePosition.NEAR_HEAD;
        } else if (stopStem === 'down') {
          vfStopPosition = vexflow.CurvePosition.NEAR_TOP;
        }
        break;
    }

    return { position: vfStartPosition, positionEnd: vfStopPosition };
  }

  private getSlurPlacement(): musicxml.AboveBelow {
    const placement = this.fragments[0].musicXML.slur.getPlacement();
    if (placement) {
      return placement;
    }

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
