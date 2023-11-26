import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as musicxml from '@/musicxml';

/** The result of rendering a wavy line. */
export type VibratoRendering = {
  type: 'vibrato';
  vexflow: {
    vibratoBracket: vexflow.VibratoBracket;
  };
};

/** A piece of a wavy line. */
export type VibratoFragment = {
  type: musicxml.StartStopContinue;
  keyIndex: number;
  vexflow: {
    note: vexflow.Note;
  };
};

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/
 */
export class Vibrato {
  private fragments: [VibratoFragment, ...VibratoFragment[]];

  constructor(opts: { fragment: VibratoFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Whether the fragment is allowed to be added to the vibrato. */
  isAllowed(fragment: VibratoFragment): boolean {
    switch (util.last(this.fragments)!.type) {
      case 'start':
      case 'continue':
        return fragment.type === 'continue' || fragment.type === 'stop';
      case 'stop':
        return false;
    }
  }

  /** Adds a fragment to the vibrato. */
  addFragment(fragment: VibratoFragment): void {
    this.fragments.push(fragment);
  }

  render(): VibratoRendering {
    const vfStartNote = util.first(this.fragments)!.vexflow.note;
    const vfEndNote = util.last(this.fragments)!.vexflow.note;

    const vfVibratoBracket = new vexflow.VibratoBracket({
      start: vfStartNote,
      stop: vfEndNote,
    });

    return {
      type: 'vibrato',
      vexflow: {
        vibratoBracket: vfVibratoBracket,
      },
    };
  }
}
