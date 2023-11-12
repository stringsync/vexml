import * as vexflow from 'vexflow';
import * as util from '@/util';
import { SpannerFragmentPhase } from './enums';
import { Address } from './address';

/** The result of rendering an octive shift. */
export type OctaveShiftRendering = {
  type: 'octaveshift';
  vexflow: {
    textBracket: vexflow.TextBracket;
  };
};

/** A piece of an octave shift. */
export type OctaveShiftFragment = {
  type: 'octaveshift';
  phase: SpannerFragmentPhase;
  vexflow: {
    note: vexflow.Note;
  };
};

/** An `OctaveShift` with metadata. */
export type OctaveShiftEntry = {
  address: Address;
  fragment: OctaveShiftFragment;
};

/**
 * Represents an octave shift.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/
 */
export class OctaveShift {
  private text: string;
  private superscript: string;
  private position: vexflow.TextBracketPosition;
  private entries: OctaveShiftEntry[];

  constructor(opts: {
    text: string;
    superscript: string;
    position: vexflow.TextBracketPosition;
    fragments: OctaveShiftEntry[];
  }) {
    util.assert(opts.fragments.length >= 2, 'must have at least 2 octave shift fragments');

    this.text = opts.text;
    this.superscript = opts.superscript;
    this.position = opts.position;
    this.entries = opts.fragments;
  }

  /** Renders the octave shift. */
  render(): OctaveShiftRendering {
    const startNote = util.first(this.entries)!.fragment.vexflow.note;
    const stopNote = util.last(this.entries)!.fragment.vexflow.note;

    const vfTextBracket = new vexflow.TextBracket({
      start: startNote,
      stop: stopNote,
      position: this.position,
      text: this.text,
      superscript: this.superscript,
    });

    return {
      type: 'octaveshift',
      vexflow: {
        textBracket: vfTextBracket,
      },
    };
  }
}
