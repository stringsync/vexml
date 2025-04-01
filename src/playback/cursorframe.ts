import * as util from '@/util';
import * as elements from '@/elements';
import { DurationRange } from './durationrange';
import { CursorFrameHint, PlaybackElement, RetriggerHint, SustainHint } from './types';

export class CursorFrame {
  constructor(
    public readonly tRange: DurationRange,
    public readonly xRange: util.NumberRange,
    public readonly yRange: util.NumberRange,
    public readonly activeElements: PlaybackElement[]
  ) {}

  getHints(previousFrame: CursorFrame): CursorFrameHint[] {
    return [...this.getRetriggerHints(previousFrame), ...this.getSustainHints(previousFrame)];
  }

  private getRetriggerHints(previousFrame: CursorFrame): RetriggerHint[] {
    const hints = new Array<RetriggerHint>();

    const previousNotes = previousFrame.activeElements.filter((e) => e.name === 'note');
    const currentNotes = this.activeElements.filter((e) => e.name === 'note');

    // Let N be the number of notes in a frame. This algorithm is O(N^2) in the worst case, but we expect to N to be
    // very small.
    for (const currentNote of currentNotes) {
      const previousNote = previousNotes.find((previousNote) =>
        isPitchEqual(currentNote.getPitch(), previousNote.getPitch())
      );
      if (previousNote && !previousNote.sharesACurveWith(currentNote)) {
        hints.push({
          type: 'retrigger',
          untriggerElement: previousNote,
          retriggerElement: currentNote,
        });
      }
    }

    return hints;
  }

  private getSustainHints(previousFrame: CursorFrame): SustainHint[] {
    const hints = new Array<SustainHint>();

    const previousNotes = previousFrame.activeElements.filter((e) => e.name === 'note');
    const currentNotes = this.activeElements.filter((e) => e.name === 'note');

    // Let N be the number of notes in a frame. This algorithm is O(N^2) in the worst case, but we expect to N to be
    // very small.
    for (const currentNote of currentNotes) {
      const previousNote = previousNotes.find((previousNote) =>
        isPitchEqual(currentNote.getPitch(), previousNote.getPitch())
      );
      if (previousNote && previousNote.sharesACurveWith(currentNote)) {
        hints.push({
          type: 'sustain',
          previousElement: previousNote,
          currentElement: currentNote,
        });
      }
    }

    return hints;
  }
}

function isPitchEqual(a: elements.Pitch, b: elements.Pitch): boolean {
  return a.step === b.step && a.octave === b.octave && a.accidentalCode === b.accidentalCode;
}
