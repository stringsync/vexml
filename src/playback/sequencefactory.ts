import * as elements from '@/elements';
import * as util from '@/util';
import { Duration } from './duration';
import { Sequence } from './sequence';
import { SequenceEntry } from './types';
import { DurationRange } from './durationrange';
import { MeasureSequenceIterator } from './measuresequenceiterator';

const LAST_MEASURE_XRANGE_PADDING_RIGHT = 6;

type SequenceEventType = 'start' | 'stop';

type SequenceEvent = {
  type: SequenceEventType;
  time: Duration;
  element: elements.VoiceEntry;
};

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

    const measures = this.score
      .getSystems()
      .flatMap((system) => system.getMeasures())
      .map((measure, index) => ({
        index,
        fragments: measure.getFragments(),
        jumps: measure.getJumps(),
      }));

    const iterator = new MeasureSequenceIterator(measures);

    let measureStartTime = Duration.zero();

    for (const measureIndex of iterator) {
      const measure = measures[measureIndex];

      let nextCurrentTime = measureStartTime;

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
          const start = measureStartTime.plus(Duration.minutes(voiceEntry.getStartMeasureBeat().toDecimal() / bpm));
          const duration = Duration.minutes(voiceEntry.getBeatCount().toDecimal() / bpm);
          const stop = start.plus(duration);

          events.push({ type: 'start', time: measureStartTime.plus(start), element: voiceEntry });
          events.push({ type: 'stop', time: measureStartTime.plus(stop), element: voiceEntry });

          if (stop.gt(nextCurrentTime)) {
            nextCurrentTime = stop;
          }
        }
      }

      measureStartTime = nextCurrentTime;
    }

    return events.sort((a, b) => a.time.ms - b.time.ms);
  }

  private toSequenceEntries(events: SequenceEvent[]): SequenceEntry[] {
    const entries = new Array<SequenceEntry>();

    let time = Duration.zero();
    const elements = new Array<elements.VoiceEntry>();
    let mostRecentElement: elements.VoiceEntry | null = null;

    for (let index = 0; index < events.length; index++) {
      const currentEvent = events[index];
      const nextEvent = events[index + 1];

      if (currentEvent.type === 'start') {
        mostRecentElement = currentEvent.element;
        elements.push(currentEvent.element);
      }

      if (currentEvent.type === 'stop') {
        elements.splice(elements.indexOf(currentEvent.element), 1);
      }

      if (nextEvent && elements.length > 0) {
        const start = time;
        const stop = nextEvent.time;
        const durationRange = new DurationRange(start, stop);
        time = stop;
        util.assertNotNull(mostRecentElement);
        // For now, the xRange will be initialized to be empty. After we've materialized all the sequence entries, we
        // will go back and fill in the xRange values.
        const xRange = new util.NumberRange(0, 0);
        entries.push({
          mostRecentElement,
          elements: [...elements],
          durationRange,
          xRange,
        });
      }
    }

    const measures = this.score.getSystems().flatMap((system) => system.getMeasures());

    // Fix the xRange values, now that we can look ahead easily.
    for (let index = 0; index < entries.length; index++) {
      const isLast = index === entries.length - 1;

      const currentEntry = entries[index];
      const currentSystemIndex = currentEntry.mostRecentElement.getSystemIndex();
      const currentMeasureIndex = currentEntry.mostRecentElement.getAbsoluteMeasureIndex();
      const currentEntryCenterX = currentEntry.mostRecentElement.rect().center().x;
      const currentMeasureEndX = measures[currentMeasureIndex].rect().getMaxX();

      if (isLast) {
        currentEntry.xRange = this.xRange(currentEntryCenterX, currentMeasureEndX - LAST_MEASURE_XRANGE_PADDING_RIGHT);
        continue;
      }

      const nextEntry = entries[index + 1];
      const nextEntryCenterX = nextEntry.mostRecentElement.rect().center().x;
      const nextSystemIndex = nextEntry.mostRecentElement.getSystemIndex();
      const nextMeasureIndex = nextEntry.mostRecentElement.getAbsoluteMeasureIndex();

      const isChangingSystems = currentSystemIndex !== nextSystemIndex;
      if (isChangingSystems) {
        currentEntry.xRange = this.xRange(currentEntryCenterX, currentMeasureEndX);
        continue;
      }

      // This can happen if there is a repeat range that spans a single measure and the measure only has one element.
      const isRepeatingTheSameNote = currentEntry.mostRecentElement === nextEntry.mostRecentElement;
      if (isRepeatingTheSameNote) {
        currentEntry.xRange = this.xRange(currentEntryCenterX, currentMeasureEndX);
        continue;
      }

      // This will happen if there's a jump in the sequence.
      const isChangingMeasures = currentMeasureIndex !== nextMeasureIndex;
      const isJumpingMeasures = currentMeasureIndex !== nextMeasureIndex - 1;
      if (isChangingMeasures && isJumpingMeasures) {
        currentEntry.xRange = this.xRange(currentEntryCenterX, currentMeasureEndX);
        continue;
      }

      const isGoingBackwards = currentEntryCenterX > nextEntryCenterX;
      if (isGoingBackwards) {
        currentEntry.xRange = this.xRange(currentEntryCenterX, currentMeasureEndX);
        continue;
      }

      // Otherwise, deduce that the next entry is on the same system and is moving forward normally.
      currentEntry.xRange = this.xRange(currentEntryCenterX, nextEntryCenterX);
    }

    return entries;
  }

  private xRange(x1: number, x2: number) {
    return new util.NumberRange(x1, Math.max(x1, x2));
  }
}
