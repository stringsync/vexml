import * as util from '@/util';
import * as elements from '@/elements';
import * as spatial from '@/spatial';
import { DurationRange } from './durationrange';
import {
  CursorFrameHint,
  CursorVerticalSpan,
  PlaybackElement,
  RetriggerHint,
  SustainHint,
  TimelineMoment,
} from './types';
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

class CursorFrameFactory {
  private frames = new Array<CursorFrame>();
  private activeElements = new Set<PlaybackElement>();

  constructor(private score: elements.Score, private timeline: Timeline, private span: CursorVerticalSpan) {}

  create(): CursorFrame[] {
    this.frames = [];
    this.activeElements = new Set<PlaybackElement>();

    for (let index = 0; index < this.timeline.getMomentCount() - 1; index++) {
      // const [anchor1, anchor2] = this.identifyAnchorPair(momentIndex);
      // const tRange = new DurationRange(currentMoment.time, nextMoment.time);
      // const xRange = this.getXRange(currentMoment, currentAnchor, nextAnchor);
      // const yRange = this.getYRange(currentAnchor);
      // this.updateActiveElements(currentMoment);
      // this.addFrame(tRange, xRange, yRange);
    }

    return this.frames;
  }

  private updateActiveElements(moment: TimelineMoment) {
    for (const event of moment.events) {
      if (event.type === 'transition') {
        if (event.kind === 'start') {
          this.activeElements.add(event.element);
        } else if (event.kind === 'stop') {
          this.activeElements.delete(event.element);
        }
      }
    }
  }

  private addFrame(tRange: DurationRange, xRange: util.NumberRange, yRange: util.NumberRange): void {
    const frame = new CursorFrame(tRange, xRange, yRange, [...this.activeElements]);
    this.frames.push(frame);
  }

  @util.memoize()
  private getYRangeBySystemIndex(): util.NumberRange[] {
    const result = new Array<util.NumberRange>();

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
      result.push(yRange);
    }

    return result;
  }
}
