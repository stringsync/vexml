import * as elements from '@/elements';
import * as util from '@/util';
import { NumberRange } from '@/util';
import { Duration } from './duration';
import { Sequence } from './sequence';
import { PlaybackElement, SequenceEntry } from './types';
import { DurationRange } from './durationrange';
import { MeasureSequenceIterator } from './measuresequenceiterator';
import { Logger } from '@/debug';

const LAST_SYSTEM_MEASURE_X_RANGE_PADDING_RIGHT = 10;

type SequenceEvent = {
  type: 'start' | 'stop';
  time: Duration;
  element: PlaybackElement;
};

export class SequenceFactory {
  constructor(private log: Logger, private score: elements.Score) {}

  create(): Sequence[] {
    const sequences = new Array<Sequence>();

    const partCount = this.score.getPartCount();

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const events = this.getSequenceEvents(partIndex);
      const entries = this.toSequenceEntries(events);
      const sequence = new Sequence(partIndex, entries);
      sequences.push(sequence);
    }

    return sequences;
  }

  private getSequenceEvents(partIndex: number): SequenceEvent[] {
    const events = new Array<SequenceEvent>();

    const measures = this.score.getMeasures().map((measure, index) => ({
      index,
      value: measure,
      fragments: measure.getFragments(),
      jumps: measure.getJumps(),
    }));

    const iterator = new MeasureSequenceIterator(measures);

    let measureStartTime = Duration.zero();

    for (const measureIndex of iterator) {
      const measure = measures[measureIndex];

      let nextMeasureStartTime = measureStartTime;

      if (measure.value.isMultiMeasure()) {
        const start = measureStartTime;
        const bpm = measure.value.getBpm();
        const duration = Duration.minutes(measure.value.getBeatCount().toDecimal() / bpm);
        const stop = start.add(duration);

        events.push({ type: 'start', time: start, element: measure.value });
        events.push({ type: 'stop', time: stop, element: measure.value });

        // measureStartTime, not nextMeasureStartTime!
        measureStartTime = stop;

        continue;
      }

      for (const fragment of measure.fragments) {
        if (fragment.isNonMusicalGap()) {
          const start = measureStartTime;
          const duration = Duration.ms(fragment.getNonMusicalDurationMs());
          const stop = start.add(duration);

          events.push({ type: 'start', time: start, element: fragment });
          events.push({ type: 'stop', time: stop, element: fragment });

          nextMeasureStartTime = stop;

          continue;
        }

        const voiceEntries = fragment
          .getParts()
          .filter((part) => part.getIndex() === partIndex)
          .flatMap((fragmentPart) => fragmentPart.getStaves())
          .flatMap((stave) => stave.getVoices())
          .flatMap((voice) => voice.getEntries());

        const bpm = fragment.getBpm();

        for (const voiceEntry of voiceEntries) {
          // NOTE: getStartMeasureBeat() is relative to the start of the measure.
          const start = measureStartTime.add(Duration.minutes(voiceEntry.getStartMeasureBeat().toDecimal() / bpm));
          const duration = Duration.minutes(voiceEntry.getBeatCount().toDecimal() / bpm);
          const stop = start.add(duration);

          events.push({ type: 'start', time: start, element: voiceEntry });
          events.push({ type: 'stop', time: stop, element: voiceEntry });

          if (stop.isGreaterThan(nextMeasureStartTime)) {
            nextMeasureStartTime = stop;
          }
        }
      }

      measureStartTime = nextMeasureStartTime;
    }

    return events.sort((a, b) => {
      if (a.time.ms !== b.time.ms) {
        return a.time.ms - b.time.ms;
      }

      if (a.type !== b.type) {
        // Stop events should come before start events.
        return a.type === 'stop' ? -1 : 1;
      }

      // If two events occur at the same time and have the same type, sort by x-coordinate.
      return a.element.rect().center().x - b.element.rect().center().x;
    });
  }

  private toSequenceEntries(events: SequenceEvent[]): SequenceEntry[] {
    const measures = this.score.getMeasures();
    const builder = new SequenceEntryBuilder(this.log, measures);

    for (const event of events) {
      builder.add(event);
    }

    return builder.build();
  }
}

type XRangeInstruction =
  | 'anchor-to-next-event'
  | 'activate-only'
  | 'terminate-to-measure-end-and-reanchor'
  | 'defer-for-interpolation'
  | 'ignore';

/** SequenceEntryBuilder incrementally transforms SequenceEvents to SequenceEntries. */
class SequenceEntryBuilder {
  private entries = new Array<SequenceEntry>();
  private anchor: PlaybackElement | null = null;
  private active = new Array<PlaybackElement>();
  private pending = new Array<SequenceEvent>();
  private x = -1;
  private t = Duration.ms(-1);
  private built = false;

  constructor(private log: Logger, private measures: elements.Measure[]) {}

  add(event: SequenceEvent): void {
    if (event.type === 'start') {
      this.start(event);
    } else {
      this.stop(event);
    }
  }

  build(): SequenceEntry[] {
    util.assert(!this.built, 'SequenceEntryBuilder has already built');

    if (this.anchor && this.pending.length > 0) {
      // We account for the last stop event by using the time of the last entry as a start bound.
      const event = this.pending.at(-1)!;
      const x1 = this.x;
      const x2 = this.getMeasureRightBoundaryX(event.element);
      const t1 = this.t;
      const t2 = event.time;
      this.push(x1, x2, t1, t2, this.anchor, this.active);
    }

    this.built = true;

    return this.entries;
  }

  private start(event: SequenceEvent): void {
    if (this.anchor) {
      const instruction = this.getXRangeInstruction(this.anchor, event.element);

      if (instruction === 'anchor-to-next-event') {
        const x1 = this.x;
        const x2 = this.getLeftBoundaryX(event.element);
        const t1 = this.t;
        const t2 = event.time;

        this.processPending(new NumberRange(x1, x2), t1);
        this.active.push(event.element);
        this.push(x1, x2, t1, t2, this.anchor, this.active);

        this.x = x2;
        this.t = t2;
      } else if (instruction === 'terminate-to-measure-end-and-reanchor') {
        const x1 = this.x;
        const x2 = this.getMeasureRightBoundaryX(this.anchor);
        const t1 = this.t;
        const t2 = event.time;

        this.processPending(new NumberRange(x1, x2), t1);
        this.active.push(event.element);
        this.push(x1, x2, t1, t2, this.anchor, this.active);

        this.x = this.getLeftBoundaryX(event.element);
        this.t = t2;
      } else if (instruction === 'defer-for-interpolation') {
        this.pending.push(event);
      } else if (instruction === 'ignore') {
        // noop
      } else if (instruction === 'activate-only') {
        this.entries.at(-1)?.activeElements.push(event.element);
        this.active.push(event.element);
      } else {
        util.assertUnreachable();
      }
    } else {
      this.x = this.getLeftBoundaryX(event.element);
      this.t = event.time;
    }

    this.anchor = event.element;
  }

  private stop(event: SequenceEvent): void {
    // A stop event does not provide a closing x-range boundary, so we don't know where to terminate the in-flight
    // sequence entry. We'll enqueue it for now, and then process it once we have a start event that can provide the
    // closing x-range boundary.
    this.pending.push(event);
  }

  private processPending(xRange: NumberRange, t1: Duration): void {
    // Now that we have a closing x-range boundary, we can process the pending events that occurred.
    while (this.pending.length > 0) {
      const event = this.pending.shift()!;

      const alpha = (event.time.ms - t1.ms) / xRange.getSize();

      const x1 = this.x;
      const x2 = util.lerp(xRange.start, xRange.end, alpha);
      // t1 is given
      const t2 = event.time;

      if (event.type === 'start') {
        if (x2 < xRange.end && t2.isLessThan(t1)) {
          this.push(x1, x2, t1, t2, this.anchor!, this.active);
        }
        this.active.push(event.element);
      } else {
        if (x2 < xRange.end && t2.isLessThan(t1)) {
          this.push(x1, x2, t1, t2, this.anchor!, this.active);
        }
        this.active.splice(this.active.indexOf(event.element), 1);
      }

      this.x = x2;
    }
  }

  private push(
    x1: number,
    x2: number,
    t1: Duration,
    t2: Duration,
    anchor: PlaybackElement,
    active: PlaybackElement[]
  ): void {
    const durationRange = new DurationRange(t1, t2);
    const xRange = new NumberRange(x1, x2);
    this.entries.push({ durationRange, xRange, anchorElement: anchor, activeElements: [...active] });
  }

  private getLeftBoundaryX(element: PlaybackElement): number {
    switch (element.name) {
      case 'fragment':
        return this.getFragmentLeftBoundaryX(element);
      case 'measure':
        return this.getMeasureLeftBoundaryX(element);
      case 'note':
      case 'rest':
        return this.getVoiceEntryBoundaryX(element);
      default:
        util.assertUnreachable();
    }
  }

  private getMeasureRightBoundaryX(element: PlaybackElement): number {
    const measure = this.measures.find((measure) =>
      measure.includesAbsoluteMeasureIndex(element.getAbsoluteMeasureIndex())
    );
    util.assertDefined(measure);

    let result = measure.rect().right();
    if (measure.isLastMeasureInSystem()) {
      result -= LAST_SYSTEM_MEASURE_X_RANGE_PADDING_RIGHT;
    }
    return result;
  }

  private getFragmentLeftBoundaryX(fragment: elements.Fragment): number {
    return (
      fragment
        .getParts()
        .flatMap((part) => part.getStaves())
        .map((stave) => stave.playableRect().left())
        .at(0) ?? fragment.rect().left()
    );
  }

  private getMeasureLeftBoundaryX(measure: elements.Measure): number {
    const fragment = measure.getFragments().at(0);
    if (fragment) {
      return this.getFragmentLeftBoundaryX(fragment);
    }
    return measure.rect().left();
  }

  private getVoiceEntryBoundaryX(voiceEntry: elements.VoiceEntry): number {
    return voiceEntry.rect().center().x;
  }

  private getXRangeInstruction(previous: PlaybackElement, current: PlaybackElement): XRangeInstruction {
    const systemIndex1 = previous.getSystemIndex();
    const systemIndex2 = current.getSystemIndex();
    const measureIndex1 = previous.getAbsoluteMeasureIndex();
    const measureIndex2 = current.getAbsoluteMeasureIndex();
    const startMeasureBeat1 = previous.getStartMeasureBeat();
    const startMeasureBeat2 = current.getStartMeasureBeat();

    const x1 = previous.rect().center().x;
    const x2 = current.rect().center().x;

    if (x1 === x2) {
      // This is common when a part has multiple staves. When elements have the same x-coordinate, we'll just add the
      // current element to the active list.
      return 'activate-only';
    }

    const isProgressingNormallyInTheSameMeasure =
      measureIndex1 === measureIndex2 && startMeasureBeat1.isLessThan(startMeasureBeat2);
    const isProgressingNormallyAcrossMeasures = measureIndex1 + 1 === measureIndex2;
    const isProgressingNormally = isProgressingNormallyInTheSameMeasure || isProgressingNormallyAcrossMeasures;

    if (isProgressingNormally && x1 < x2) {
      return 'anchor-to-next-event';
    }

    // Below this point, we need to figure out why this is not progressing normally x1 >= x2.

    if (systemIndex1 < systemIndex2) {
      return 'terminate-to-measure-end-and-reanchor';
    }

    if (measureIndex1 === measureIndex2 && startMeasureBeat1.isGreaterThanOrEqualTo(startMeasureBeat2)) {
      // This is ultimately a formatting issue: the current element is rendered before the previous element, even though
      // the current element is played later. In this case, we'll just ignore it and keep progressing until we can find
      // a valid movement forward.
      return 'defer-for-interpolation';
    }

    if (measureIndex1 > measureIndex2) {
      return 'terminate-to-measure-end-and-reanchor';
    }

    // NOTE: Currently, we cannot detect a valid jump forward _in the same measure_. We consider this exceptionally
    // rare and playback is not support for this case.
    if (measureIndex1 + 1 < measureIndex2) {
      return 'terminate-to-measure-end-and-reanchor';
    }

    // At this point, we're in a non-ideal state that isn't covered by any of the cases above. We'll just ignore it.
    return 'ignore';
  }
}
