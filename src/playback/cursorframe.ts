import * as util from '@/util';
import * as elements from '@/elements';
import { Logger } from '@/debug';
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

type TRangeSource = {
  moment: TimelineMoment;
};

type XRangeSource =
  | { type: 'system'; system: elements.System; bound: 'left' | 'right' }
  | { type: 'measure'; measure: elements.Measure; bound: 'left' | 'right' }
  | { type: 'element'; element: PlaybackElement; bound: 'left' | 'right' };

type YRangeSource = {
  part: elements.Part;
  bound: 'top' | 'bottom';
};

export class CursorFrame {
  constructor(
    private tRangeSources: [TRangeSource, TRangeSource],
    private xRangeSources: [XRangeSource, XRangeSource],
    private yRangeSources: [YRangeSource, YRangeSource],
    private activeElements: PlaybackElement[],
    private describer: CursorFrameDescriber
  ) {}

  static create(logger: Logger, score: elements.Score, timeline: Timeline, span: CursorVerticalSpan): CursorFrame[] {
    const partCount = score.getPartCount();
    if (partCount === 0) {
      logger.warn('No parts found in score, returning empty cursor frames.');
      return [];
    }

    if (0 > span.fromPartIndex || span.fromPartIndex >= partCount) {
      throw new Error(`Invalid fromPartIndex: ${span.fromPartIndex}, must be in [0,${partCount - 1}]`);
    }

    if (0 > span.toPartIndex || span.toPartIndex >= partCount) {
      throw new Error(`Invalid toPartIndex: ${span.toPartIndex}, must be in [0,${partCount - 1}]`);
    }

    const factory = new CursorFrameFactory(logger, score, timeline, span);
    return factory.create();
  }

  get tRange(): DurationRange {
    const t1 = this.tRangeSources[0].moment.time;
    const t2 = this.tRangeSources[1].moment.time;
    return new DurationRange(t1, t2);
  }

  get xRange(): util.NumberRange {
    const x1 = this.toXRangeBound(this.xRangeSources[0]);
    const x2 = this.toXRangeBound(this.xRangeSources[1]);
    return new util.NumberRange(x1, x2);
  }

  get yRange(): util.NumberRange {
    const y1 = this.getYRangeBound(this.yRangeSources[0]);
    const y2 = this.getYRangeBound(this.yRangeSources[1]);
    return new util.NumberRange(y1, y2);
  }

  getHints(previousFrame: CursorFrame): CursorFrameHint[] {
    return [...this.getRetriggerHints(previousFrame), ...this.getSustainHints(previousFrame)];
  }

  getActiveElements(): PlaybackElement[] {
    return [...this.activeElements];
  }

  toHumanReadable(): string[] {
    const tRangeDescription = this.describer.describeTRange(this.tRangeSources);
    const xRangeDescription = this.describer.describeXRange(this.xRangeSources);
    const yRangeDescription = this.describer.describeYRange(this.yRangeSources);

    return [`t: ${tRangeDescription}`, `x: ${xRangeDescription}`, `y: ${yRangeDescription}`];
  }

  private toXRangeBound(source: XRangeSource): number {
    switch (source.type) {
      case 'system':
        return source.bound === 'left' ? source.system.rect().left() : source.system.rect().right();
      case 'measure':
        return source.bound === 'left' ? source.measure.rect().left() : source.measure.rect().right();
      case 'element':
        return source.bound === 'left' ? source.element.rect().left() : source.element.rect().right();
    }
  }

  private getYRangeBound(source: YRangeSource): number {
    return source.bound === 'top' ? source.part.rect().top() : source.part.rect().bottom();
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
  private describer: CursorFrameDescriber;

  constructor(
    private logger: Logger,
    private score: elements.Score,
    private timeline: Timeline,
    private span: CursorVerticalSpan
  ) {
    this.describer = CursorFrameDescriber.create(score, timeline.getPartIndex());
  }

  create(): CursorFrame[] {
    this.frames = [];
    this.activeElements = new Set<PlaybackElement>();

    for (let index = 0; index < this.timeline.getMomentCount() - 1; index++) {
      const currentMoment = this.timeline.getMoment(index);
      const nextMoment = this.timeline.getMoment(index + 1);
      util.assertNotNull(currentMoment);
      util.assertNotNull(nextMoment);

      const tRangeSources = this.getTRangeSources(currentMoment, nextMoment);
      const xRangeSources = this.getXRangeSources(currentMoment, nextMoment);
      const yRangeSources = this.getYRangeSources(currentMoment);

      this.updateActiveElements(currentMoment);

      this.addFrame(tRangeSources, xRangeSources, yRangeSources);
    }

    return this.frames;
  }

  private getTRangeSources(currentMoment: TimelineMoment, nextMoment: TimelineMoment): [TRangeSource, TRangeSource] {
    return [{ moment: currentMoment }, { moment: nextMoment }];
  }

  private getXRangeSources(currentMoment: TimelineMoment, nextMoment: TimelineMoment): [XRangeSource, XRangeSource] {
    return [this.getStartXSource(currentMoment), this.getEndXSource(currentMoment, nextMoment)];
  }

  private getStartXSource(moment: TimelineMoment): XRangeSource {
    const hasStartingTransition = moment.events.some((e) => e.type === 'transition' && e.kind === 'start');
    if (hasStartingTransition) {
      return this.getLeftmostStartingXRangeSource(moment);
    }

    this.logger.warn(
      'No starting transition found for moment, ' +
        'but the moment is trying to be used as a starting anchor. ' +
        'How was the moment created?',
      { moment }
    );

    const event = moment.events.at(0);
    util.assertDefined(event);

    switch (event.type) {
      case 'transition':
        return { type: 'element', element: event.element, bound: 'left' };
      case 'systemend':
        return { type: 'system', system: event.system, bound: 'left' };
      case 'jump':
        return { type: 'measure', measure: event.measure, bound: 'left' };
    }
  }

  private getEndXSource(currentMoment: TimelineMoment, nextMoment: TimelineMoment): XRangeSource {
    const shouldUseMeasureEndBoundary = nextMoment.events.some((e) => e.type === 'jump' || e.type === 'systemend');
    if (shouldUseMeasureEndBoundary) {
      const event = currentMoment.events.at(0);
      util.assertDefined(event);

      switch (event.type) {
        case 'transition':
          return { type: 'measure', measure: event.measure, bound: 'right' };
        case 'systemend':
          return { type: 'system', system: event.system, bound: 'right' };
        case 'jump':
          return { type: 'measure', measure: event.measure, bound: 'right' };
      }
    }

    return this.getStartXSource(nextMoment);
  }

  private getLeftmostStartingXRangeSource(currentMoment: TimelineMoment): XRangeSource {
    const elements = currentMoment.events
      .filter((e) => e.type === 'transition')
      .filter((e) => e.kind === 'start')
      .map((e) => e.element);

    let min = Infinity;
    let leftmost: PlaybackElement | undefined = undefined;
    for (const element of elements) {
      const left = element.rect().left();
      if (left < min) {
        min = left;
        leftmost = element;
      }
    }

    util.assertDefined(leftmost);

    return { type: 'element', element: leftmost, bound: 'left' };
  }

  private getYRangeSources(currentMoment: TimelineMoment): [YRangeSource, YRangeSource] {
    const systemIndex = this.getSystemIndex(currentMoment);

    const parts = this.score
      .getSystems()
      .at(systemIndex)!
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts());

    const topPart = parts.find((part) => part.getIndex() === this.span.fromPartIndex);
    const bottomPart = parts.find((part) => part.getIndex() === this.span.toPartIndex);
    util.assertDefined(topPart);
    util.assertDefined(bottomPart);

    return [
      { part: topPart, bound: 'top' },
      { part: bottomPart, bound: 'bottom' },
    ];
  }

  private getSystemIndex(currentMoment: TimelineMoment): number {
    const events = currentMoment.events.toSorted((a, b) => {
      const kindOrder = { start: 0, stop: 1 };
      if (a.type === 'transition' && b.type === 'transition') {
        return kindOrder[a.kind] - kindOrder[b.kind];
      }
      const typeOrder = { transition: 0, systemend: 1, jump: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
    for (const event of events) {
      switch (event.type) {
        case 'transition':
          return event.measure.getSystemIndex();
        case 'systemend':
          return event.system.getIndex();
        case 'jump':
          return event.measure.getSystemIndex();
      }
    }
    util.assertUnreachable();
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

  private addFrame(
    tRangeSources: [TRangeSource, TRangeSource],
    xRangeSources: [XRangeSource, XRangeSource],
    yRangeSources: [YRangeSource, YRangeSource]
  ): void {
    const frame = new CursorFrame(
      tRangeSources,
      xRangeSources,
      yRangeSources,
      [...this.activeElements],
      this.describer
    );
    this.frames.push(frame);
  }
}

class CursorFrameDescriber {
  private constructor(private elements: Map<PlaybackElement, number>) {}

  static create(score: elements.Score, partIndex: number): CursorFrameDescriber {
    const elements = new Map<PlaybackElement, number>();
    score
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts().at(partIndex) ?? [])
      .flatMap((part) => part.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries())
      .forEach((element, index) => {
        elements.set(element, index);
      });
    return new CursorFrameDescriber(elements);
  }

  describeTRange(tRangeSources: [TRangeSource, TRangeSource]): string {
    return `[${tRangeSources[0].moment.time.ms}ms - ${tRangeSources[1].moment.time.ms}ms]`;
  }

  describeXRange(xRangeSources: [XRangeSource, XRangeSource]): string {
    return `[${this.describeXRangeSource(xRangeSources[0])} - ${this.describeXRangeSource(xRangeSources[1])}]`;
  }

  describeYRange(yRangeSources: [YRangeSource, YRangeSource]): string {
    return `[${this.describeYRangeSource(yRangeSources[0])} - ${this.describeYRangeSource(yRangeSources[1])}]`;
  }

  private describeXRangeSource(source: XRangeSource): string {
    switch (source.type) {
      case 'system':
        return `${source.bound}(system(${source.system.getIndex()}))`;
      case 'measure':
        return `${source.bound}(measure(${source.measure.getAbsoluteMeasureIndex()}))`;
      case 'element':
        return `${source.bound}(element(${this.elements.get(source.element)}))`;
    }
  }

  private describeYRangeSource(source: YRangeSource): string {
    return `${source.bound}(system(${source.part.getSystemIndex()}), part(${source.part.getIndex()}))`;
  }
}
