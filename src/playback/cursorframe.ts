import * as util from '@/util';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import { DurationRange } from './durationrange';
import { CursorFrameHint, CursorVerticalSpan, PlaybackElement, RetriggerHint, SustainHint } from './types';
import { Timeline } from './timeline';

export class CursorFrame {
  constructor(
    public readonly tRange: DurationRange,
    public readonly xRange: util.NumberRange,
    public readonly yRange: util.NumberRange,
    public readonly activeElements: PlaybackElement[]
  ) {}

  static create(score: elements.Score, timeline: Timeline, span: CursorVerticalSpan): CursorFrame[] {
    const factory = new CursorFrameFactory(score, timeline, span);
    return factory.create();
  }

  getHints(previousFrame: CursorFrame): CursorFrameHint[] {
    return [...this.getRetriggerHints(previousFrame), ...this.getSustainHints(previousFrame)];
  }

  private getRetriggerHints(previousFrame: CursorFrame): RetriggerHint[] {
    const hints = new Array<RetriggerHint>();
    if (this === previousFrame) {
      return hints;
    }

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
    if (this === previousFrame) {
      return hints;
    }

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

class CursorFrameFactory {
  constructor(private score: elements.Score, private timeline: Timeline, private span: CursorVerticalSpan) {}

  create(): CursorFrame[] {
    // NumberRange objects indexed by system index for the part.
    const systemPartYRanges = new Array<util.NumberRange>();
    for (const system of this.score.getSystems()) {
      const rect = spatial.Rect.merge(
        system
          .getMeasures()
          .flatMap((measure) => measure.getFragments())
          .flatMap((fragment) => fragment.getParts())
          .filter((part) => this.span.fromPartIndex <= part.getIndex() && part.getIndex() <= this.span.toPartIndex)
          .map((part) => part.rect())
      );
      const yRange = new util.NumberRange(rect.top(), rect.bottom());
      systemPartYRanges.push(yRange);
    }

    const frames = new Array<CursorFrame>();

    const activeElements = new Array<PlaybackElement>();

    const momentCount = this.timeline.getMomentCount();
    for (let index = 0; index < momentCount - 1; index++) {
      const current = this.timeline.getMoment(index);
      const next = this.timeline.getMoment(index + 1);

      util.assertNotNull(current);
      util.assertNotNull(next);

      const tRange = new DurationRange(current.time, next.time);
      // TODO: Decide what the anchor element should be and calculate these.
      const xRange = new util.NumberRange(0, 0);
      const yRange = systemPartYRanges[0];

      const frame = new CursorFrame(tRange, xRange, yRange, [...activeElements]);
      frames.push(frame);
    }

    return frames;
  }
}
