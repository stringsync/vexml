import * as vexflow from 'vexflow';
import { Address } from './address';
import { OctaveShift, OctaveShiftEntry, OctaveShiftFragment, OctaveShiftRendering } from './octaveshift';

/** The result of rendering spanners. */
export type SpannersRendering = {
  type: 'spanners';
  octaveShifts: OctaveShiftRendering[];
};

/**
 * Represents a piece of a spanner.
 *
 * Spanners are structures that involve groups of notes.
 *
 * Examples:
 *   - beams
 *   - tuplets
 *   - slurs
 */
export type SpannerFragment = OctaveShiftFragment;

/** A `SpannerFragment` with metadata. */
export type SpannerEntry<T extends SpannerFragment = SpannerFragment> = {
  address: Address<'system'>;
  fragment: T;
};

/**
 * Houses **all** spanner structures that contain multiple notes.
 *
 * NB: This class is intentionally plural, because it doesn't make complete sense to represent a single spanner. This is
 * meant to hold the logic of creating _multiple_ spanners from a list of `SpannerFragments`. We don't want the caller
 * to have to delineate where each spanner stops.
 */
export class LegacySpanners {
  private entries: SpannerEntry[];

  constructor(opts: { entries: SpannerEntry[] }) {
    this.entries = opts.entries;
  }

  /** Renders the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      octaveShifts: this.getOctaveShifts().map((octaveShift) => octaveShift.render()),
    };
  }

  private getOctaveShifts(): OctaveShift[] {
    const octaveShifts = new Array<OctaveShift>();

    let text = '';
    let superscript = '';
    let textBracketPosition = vexflow.TextBracketPosition.BOTTOM;
    let address = Address.system();
    let buffer = new Array<OctaveShiftEntry>();

    function reset() {
      text = '';
      superscript = '';
      textBracketPosition = vexflow.TextBracketPosition.BOTTOM;
      buffer = [];
    }

    // NOTE: Underspecified octave shifts end up getting ignored.
    function addOctaveShift() {
      if (buffer.length >= 2) {
        octaveShifts.push(
          new OctaveShift({
            text,
            superscript,
            entries: buffer,
            position: textBracketPosition,
          })
        );
      }
    }

    const entries = this.entries.filter((entry): entry is OctaveShiftEntry => entry.fragment.type === 'octaveshift');

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const fragment = entry.fragment;
      const isLast = index === entries.length - 1;

      switch (fragment.phase) {
        case 'start':
          text = fragment.text;
          superscript = fragment.superscript;
          textBracketPosition = fragment.vexflow.textBracketPosition;
          address = entry.address;
          buffer.push(entry);
          break;
        case 'continue':
          if (entry.address.isMemberOf('system', address)) {
            buffer.push(entry);
          } else {
            addOctaveShift();
            address = entry.address;
            buffer = [entry];
          }
          break;
        case 'stop':
          buffer.push(entry);
          addOctaveShift();
          reset();
          break;
      }

      if (isLast) {
        addOctaveShift();
      }
    }

    return octaveShifts;
  }
}
