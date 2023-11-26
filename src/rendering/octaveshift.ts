import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Address } from './address';

/** The result of rendering an octive shift. */
export type OctaveShiftRendering = {
  type: 'octaveshift';
  vexflow: {
    textBracket: vexflow.TextBracket;
  };
};

/** A piece of an octave shift. */
export type OctaveShiftFragment = StartOctaveShiftFragment | ContinueOctaveShiftFragment | StopOctaveShiftFragment;

type StartOctaveShiftFragment = {
  type: 'start';
  text: string;
  superscript: string;
  vexflow: {
    note: vexflow.Note;
    textBracketPosition: vexflow.TextBracketPosition;
  };
};

type ContinueOctaveShiftFragment = {
  type: 'continue';
  vexflow: {
    note: vexflow.Note;
  };
};

type StopOctaveShiftFragment = {
  type: 'stop';
  vexflow: {
    note: vexflow.Note;
  };
};

/** An `OctaveShift` with metadata. */
export type OctaveShiftEntry = {
  address: Address<'system'>;
  fragment: OctaveShiftFragment;
};

/**
 * Represents an octave shift.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/
 */
export class OctaveShift {
  private fragments: [StartOctaveShiftFragment, ...OctaveShiftFragment[]];

  constructor(opts: { fragment: StartOctaveShiftFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Whether the fragment is allowed to be added to the octave shift. */
  isAllowed(fragment: OctaveShiftFragment): boolean {
    switch (util.last(this.fragments)!.type) {
      case 'start':
      case 'continue':
        return fragment.type === 'continue' || fragment.type === 'stop';
      case 'stop':
        return false;
    }
  }

  /** Adds a fragment to the octave shift. */
  addFragment(fragment: OctaveShiftFragment): void {
    this.fragments.push(fragment);
  }

  /** Renders the octave shift. */
  render(): OctaveShiftRendering {
    const startNote = util.first(this.fragments)!.vexflow.note;
    const stopNote = util.last(this.fragments)!.vexflow.note;

    const startOctaveShiftFragment = this.getStartOctaveShiftFragment();

    const vfTextBracket = new vexflow.TextBracket({
      start: startNote,
      stop: stopNote,
      position: startOctaveShiftFragment.vexflow.textBracketPosition,
      text: startOctaveShiftFragment.text,
      superscript: startOctaveShiftFragment.superscript,
    });

    return {
      type: 'octaveshift',
      vexflow: {
        textBracket: vfTextBracket,
      },
    };
  }

  private getStartOctaveShiftFragment(): StartOctaveShiftFragment {
    return this.fragments[0];
  }
}
