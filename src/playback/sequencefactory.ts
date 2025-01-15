import * as elements from '@/elements';
import * as util from '@/util';
import { NumberRange } from '@/util';
import { Duration } from './duration';
import { Sequence } from './sequence';
import { SequenceEntry } from './types';
import { DurationRange } from './durationrange';
import { MeasureSequenceIterator } from './measuresequenceiterator';

const LAST_SYSTEM_MEASURE_X_RANGE_PADDING_RIGHT = 10;

type SequenceEventType = 'start' | 'stop';

type SequenceEvent = {
  type: SequenceEventType;
  time: Duration;
  element: elements.VoiceEntry;
};

type VoiceEntryRelationship =
  | 'normal'
  | 'valid-jump-forwards'
  | 'valid-jump-backwards'
  | 'progressing-systems'
  | 'backwards-formatting-edge-case';

export class SequenceFactory {
  constructor(private score: elements.Score) {}

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
      fragments: measure.getFragments(),
      jumps: measure.getJumps(),
    }));

    const iterator = new MeasureSequenceIterator(measures);

    let measureStartTime = Duration.zero();

    for (const measureIndex of iterator) {
      const measure = measures[measureIndex];

      let nextMeasureStartTime = measureStartTime;

      for (const fragment of measure.fragments) {
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

    return events.sort((a, b) => a.time.ms - b.time.ms);
  }

  private toSequenceEntries(events: SequenceEvent[]): SequenceEntry[] {
    const entries = new Array<SequenceEntry>();

    if (events.length === 0) {
      return entries;
    }

    let anchorElement = events.at(0)!.element;
    let activeElements = new Array<elements.VoiceEntry>();
    let t1 = Duration.ms(-1);
    let t2 = Duration.ms(-1);
    let x1 = -1;
    let x2 = -1;

    function publish() {
      const durationRange = new DurationRange(t1, t2);
      const xRange = new NumberRange(x1, x2);
      entries.push({ anchorElement, activeElements, durationRange, xRange });
    }

    function reset() {
      activeElements = [...activeElements];
      t1 = Duration.ms(-1);
      t2 = Duration.ms(-1);
      x1 = -1;
      x2 = -1;
    }

    const measures = this.score.getMeasures();

    function measureRight(absoluteMeasureIndex: number): number {
      const measure = measures[absoluteMeasureIndex];
      let right = measure.rect().right();
      if (measure.isLastMeasureInSystem()) {
        right -= LAST_SYSTEM_MEASURE_X_RANGE_PADDING_RIGHT;
      }
      return right;
    }

    for (let index = 0; index < events.length; index++) {
      const isFirst = index === 0;
      const isLast = index === events.length - 1;
      const event = events[index];

      // First, update the active elements.
      if (event.type === 'start') {
        activeElements.push(event.element);
      } else if (event.type === 'stop') {
        activeElements.splice(activeElements.indexOf(event.element), 1);
      } else {
        util.assertUnreachable();
      }

      // Next, handle the event based on the relationship to the anchor.
      if (event.type === 'start') {
        const relationship = this.getRelationshipBetween(anchorElement, event.element);
        if (isFirst) {
          // Set the start bounds of the first entry.
          t1 = event.time;
          x1 = event.element.rect().center().x;
        } else if (relationship === 'normal') {
          // Set the end bounds of the current entry.
          t2 = event.time;
          x2 = event.element.rect().center().x;

          publish();
          reset();

          // Set the start bounds of the next entry.
          anchorElement = event.element;
          t1 = event.time;
          x1 = event.element.rect().center().x;
        } else if (relationship === 'valid-jump-forwards') {
          // Set the end bounds of the current entry.
          t2 = event.time;
          x2 = measureRight(anchorElement.getAbsoluteMeasureIndex());

          publish();
          reset();

          // Set the start bounds of the next entry.
          anchorElement = event.element;
          t1 = event.time;
          x1 = event.element.rect().center().x;
        } else if (relationship === 'valid-jump-backwards' || relationship === 'progressing-systems') {
          // Set the end bounds of the current entry.
          t2 = event.time;
          x2 = measureRight(anchorElement.getAbsoluteMeasureIndex());

          publish();
          reset();

          // Set the start bounds of the next entry.
          anchorElement = event.element;
          t1 = event.time;
          x1 = event.element.rect().center().x;
        } else if (relationship === 'backwards-formatting-edge-case') {
          // When formatting causes a backwards relationship, we just need to adjust the bounds. We don't publish because
          // we don't want the sequence to go backwards spatially.
          t2 = event.time;
        } else {
          util.assertUnreachable();
        }
      }

      if (isLast) {
        t2 = event.time;
        x2 = measureRight(anchorElement.getAbsoluteMeasureIndex());
        publish();
      }
    }

    return entries;
  }

  private getRelationshipBetween(
    voiceEntry1: elements.VoiceEntry,
    voiceEntry2: elements.VoiceEntry
  ): VoiceEntryRelationship {
    const systemIndex1 = voiceEntry1.getSystemIndex();
    const systemIndex2 = voiceEntry2.getSystemIndex();
    const measureIndex1 = voiceEntry1.getAbsoluteMeasureIndex();
    const measureIndex2 = voiceEntry2.getAbsoluteMeasureIndex();
    const startMeasureBeat1 = voiceEntry1.getStartMeasureBeat();
    const startMeasureBeat2 = voiceEntry2.getStartMeasureBeat();

    const x1 = voiceEntry1.rect().center().x;
    const x2 = voiceEntry2.rect().center().x;

    const isProgressingNormallyInTheSameMeasure =
      measureIndex1 === measureIndex2 && startMeasureBeat1.isLessThan(startMeasureBeat2);
    const isProgressingNormallyAcrossMeasures = measureIndex1 + 1 === measureIndex2;
    const isProgressingNormally = isProgressingNormallyInTheSameMeasure || isProgressingNormallyAcrossMeasures;

    if (isProgressingNormally && x1 < x2) {
      return 'normal';
    }

    // Below this point, we need to figure out why this is not progressing normally x1 >= x2.

    if (systemIndex1 < systemIndex2) {
      return 'progressing-systems';
    }

    if (measureIndex1 === measureIndex2 && startMeasureBeat1.isGreaterThanOrEqualTo(startMeasureBeat2)) {
      return 'valid-jump-backwards';
    }

    if (measureIndex1 > measureIndex2) {
      return 'valid-jump-backwards';
    }

    // NOTE: Currently, we cannot detect a valid jump forward _in the same measure_. We consider this exceptionally
    // rare and playback is not support for this case.
    if (measureIndex1 + 1 < measureIndex2) {
      return 'valid-jump-forwards';
    }

    return 'backwards-formatting-edge-case';
  }
}
