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

/**
 * An element used to spatially scope the cursor frame.
 */
type Anchor = PlaybackElement | elements.System;

class CursorFrameFactory {
  private frames = new Array<CursorFrame>();
  private activeElements = new Set<PlaybackElement>();

  constructor(private score: elements.Score, private timeline: Timeline, private span: CursorVerticalSpan) {}

  create(): CursorFrame[] {
    this.frames = [];
    this.activeElements = new Set<PlaybackElement>();

    const anchors = this.timeline.getMoments().map((moment) => this.identifyAnchor(moment));

    const momentCount = this.timeline.getMomentCount();
    for (let index = 0; index < momentCount - 1; index++) {
      const currentMoment = this.timeline.getMoment(index);
      const nextMoment = this.timeline.getMoment(index + 1);
      util.assertNotNull(currentMoment);
      util.assertNotNull(nextMoment);

      const currentAnchor = anchors.at(index);
      const nextAnchor = anchors.at(index + 1);
      util.assertDefined(currentAnchor);
      util.assertDefined(nextAnchor);

      const tRange = new DurationRange(currentMoment.time, nextMoment.time);
      const xRange = this.getXRange(currentMoment, currentAnchor, nextAnchor);
      const yRange = this.getYRange(currentAnchor);

      this.updateActiveElements(currentMoment);

      this.addFrame(tRange, xRange, yRange);
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

  private getXRange(currentMoment: TimelineMoment, currentAnchor: Anchor, nextAnchor: Anchor): util.NumberRange {
    const left = currentAnchor.rect().left();
    let right = nextAnchor.rect().left();

    // Check to see if the current moment has any events that should adjust the right boundary.
    for (const event of currentMoment.events) {
      if (event.type === 'systemend') {
        right = event.system.rect().right();
        break;
      } else if (event.type === 'jump') {
        right = event.measure.rect().right();
        break;
      }
    }

    return new util.NumberRange(left, right);
  }

  private getYRange(currentAnchor: Anchor) {
    const systemIndex = this.getSystemIndex(currentAnchor);
    const yRange = this.getYRangeBySystemIndex().at(systemIndex);
    util.assertDefined(yRange);
    return yRange;
  }

  private getSystemIndex(anchor: Anchor) {
    if (anchor instanceof elements.System) {
      return anchor.getIndex();
    } else {
      return anchor.getSystemIndex();
    }
  }

  /**
   * Returns the element that is considered the "main" element of the moment. This is used to determine the x-range of
   * a frame.
   */
  private identifyAnchor(moment: TimelineMoment): Anchor {
    // First, select the start elements.
    const elements = moment.events
      .filter((e) => e.type === 'transition')
      .filter((e) => e.kind === 'start')
      .map((e) => e.element);

    // If there are no start elements, use the first measure.
    if (elements.length === 0) {
      for (const event of moment.events) {
        if (event.type === 'transition') {
          return event.measure;
        } else if (event.type === 'jump') {
          return event.measure;
        } else if (event.type === 'systemend') {
          return event.system;
        } else {
          util.assertUnreachable();
        }
      }
    }

    // Otherwise, select the leftmost element.
    let anchor = elements[0];
    let min = elements[0].rect().left();
    for (const element of elements) {
      const x = element.rect().left();
      if (x < min) {
        min = x;
        anchor = element;
      }
    }
    return anchor;
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
