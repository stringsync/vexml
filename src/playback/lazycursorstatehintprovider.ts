import * as elements from '@/elements';
import * as util from '@/util';
import {
  CursorFrame,
  CursorStateHint,
  CursorStateHintProvider,
  PlaybackElement,
  RetriggerHint,
  StartHint,
  StopHint,
  SustainHint,
} from './types';

export class LazyCursorStateHintProvider implements CursorStateHintProvider {
  constructor(private currentFrame: CursorFrame, private previousFrame: CursorFrame | undefined) {}

  @util.memoize()
  get(): CursorStateHint[] {
    if (!this.previousFrame) {
      return [];
    }
    if (this.currentFrame === this.previousFrame) {
      return [];
    }

    const previousElements = new Set(this.previousFrame.getActiveElements());
    const currentElements = new Set(this.currentFrame.getActiveElements());

    const previousNotes = this.previousFrame.getActiveElements().filter((e) => e.name === 'note');
    const currentNotes = this.currentFrame.getActiveElements().filter((e) => e.name === 'note');

    return [
      ...this.getStartHints(currentElements, previousElements),
      ...this.getStopHints(currentElements, previousElements),
      ...this.getRetriggerHints(currentNotes, previousNotes),
      ...this.getSustainHints(currentNotes, previousNotes),
    ];
  }

  private getStartHints(previousElements: Set<PlaybackElement>, currentElements: Set<PlaybackElement>): StartHint[] {
    const hints = new Array<StartHint>();

    for (const element of currentElements) {
      if (!previousElements.has(element)) {
        hints.push({ type: 'start', element });
      }
    }

    return hints;
  }

  private getStopHints(previousElements: Set<PlaybackElement>, currentElements: Set<PlaybackElement>): StopHint[] {
    const hints = new Array<StopHint>();

    for (const element of previousElements) {
      if (!currentElements.has(element)) {
        hints.push({ type: 'stop', element });
      }
    }

    return hints;
  }

  private getRetriggerHints(currentNotes: elements.Note[], previousNotes: elements.Note[]): RetriggerHint[] {
    const hints = new Array<RetriggerHint>();

    // Let N be the number of notes in a frame. This algorithm is O(N^2) in the worst case, but we expect to N to be
    // very small.
    for (const currentNote of currentNotes) {
      const previousNote = previousNotes.find((previousNote) =>
        this.isPitchEqual(currentNote.getPitch(), previousNote.getPitch())
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

  private getSustainHints(currentNotes: elements.Note[], previousNotes: elements.Note[]): SustainHint[] {
    const hints = new Array<SustainHint>();

    // Let N be the number of notes in a frame. This algorithm is O(N^2) in the worst case, but we expect to N to be
    // very small.
    for (const currentNote of currentNotes) {
      const previousNote = previousNotes.find((previousNote) =>
        this.isPitchEqual(currentNote.getPitch(), previousNote.getPitch())
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

  private isPitchEqual(a: elements.Pitch, b: elements.Pitch): boolean {
    return a.step === b.step && a.octave === b.octave && a.accidentalCode === b.accidentalCode;
  }
}
