import { Logger } from '@/debug';
import { Duration } from './duration';
import { PlaybackElement, TimelineEvent, TransitionEvent } from './types';
import * as elements from '@/elements';
import { MeasureSequenceIterator } from './measuresequenceiterator';
import * as util from '@/util';

export class Timeline {
  constructor(private partIndex: number, private events: TimelineEvent[]) {}

  static create(logger: Logger, score: elements.Score): Timeline[] {
    const partCount = score.getPartCount();
    const timelines = new Array<Timeline>(partCount);
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      timelines[partIndex] = new TimelineFactory(logger, score, partIndex).create();
    }
    return timelines;
  }

  getPartIndex(): number {
    return this.partIndex;
  }

  getEvent(index: number): TimelineEvent | null {
    return this.events.at(index) ?? null;
  }

  getEvents(): TimelineEvent[] {
    return this.events;
  }

  getCount(): number {
    return this.events.length;
  }

  getDuration(): Duration {
    return this.events.at(-1)?.time ?? Duration.zero();
  }
}

class TimelineFactory {
  private events = new Array<TimelineEvent>();
  private currentMeasureStartTime = Duration.zero();
  private nextMeasureStartTime = Duration.zero();

  constructor(private logger: Logger, private score: elements.Score, private partIndex: number) {}

  create(): Timeline {
    this.events = [];
    this.currentMeasureStartTime = Duration.zero();

    this.populateEvents();
    this.sortEvents();
    this.simplifyEvents();
    this.sortTransitions();

    return new Timeline(this.partIndex, this.events);
  }

  private getMeasuresInPlaybackOrder(): Array<{ measure: elements.Measure; willJump: boolean }> {
    const measures = this.score.getMeasures();

    const measureIndexes = Array.from(
      new MeasureSequenceIterator(measures.map((measure, index) => ({ index, jumps: measure.getJumps() })))
    );

    const result = new Array<{ measure: elements.Measure; willJump: boolean }>();

    for (let i: number = 0; i < measureIndexes.length; i++) {
      const current = measureIndexes[i];
      const next = measureIndexes.at(i + 1);
      const willJump = !!next && next !== current + 1;
      const measure = measures[current];
      result.push({ measure, willJump });
    }

    return result;
  }

  private proposeNextMeasureStartTime(time: Duration): void {
    this.nextMeasureStartTime = Duration.max(this.nextMeasureStartTime, time);
  }

  private toDuration(beat: util.Fraction, bpm: number): Duration {
    const duration = Duration.minutes(beat.divide(new util.Fraction(bpm)).toDecimal());
    // Round to the nearest 100ms. This is needed to correctly group transitions that should belong together.
    const ms = Math.round(duration.ms / 100) * 100;
    return Duration.ms(ms);
  }

  private populateEvents(): void {
    for (const { measure, willJump } of this.getMeasuresInPlaybackOrder()) {
      if (measure.isMultiMeasure()) {
        this.populateMultiMeasureEvents(measure);
      } else {
        this.populateFragmentEvents(measure);
      }

      this.currentMeasureStartTime = this.nextMeasureStartTime;

      if (willJump) {
        this.addJumpEvent(this.currentMeasureStartTime);
      }

      if (measure.isLastMeasureInSystem()) {
        this.addSystemEndEvent(this.currentMeasureStartTime);
      }
    }
  }

  private populateMultiMeasureEvents(measure: elements.Measure): void {
    util.assert(measure.isMultiMeasure(), 'measure must be a multi-measure');

    const bpm = measure.getBpm();
    const duration = this.toDuration(measure.getBeatCount(), bpm);
    const startTime = this.currentMeasureStartTime;
    const stopTime = startTime.add(duration);

    this.addTransitionStartEvent(startTime, measure);
    this.addTransitionStopEvent(stopTime, measure);

    this.proposeNextMeasureStartTime(stopTime);
  }

  private populateFragmentEvents(measure: elements.Measure): void {
    for (const fragment of measure.getFragments()) {
      if (fragment.isNonMusicalGap()) {
        this.populateNonMusicalGapEvents(fragment);
      } else {
        this.populateVoiceEntryEvents(fragment);
      }
    }
  }

  private populateNonMusicalGapEvents(fragment: elements.Fragment): void {
    const duration = Duration.ms(fragment.getNonMusicalDurationMs());
    const startTime = this.currentMeasureStartTime;
    const stopTime = startTime.add(duration);

    this.addTransitionStartEvent(startTime, fragment);
    this.addTransitionStopEvent(stopTime, fragment);

    this.proposeNextMeasureStartTime(stopTime);
  }

  private populateVoiceEntryEvents(fragment: elements.Fragment): void {
    const voiceEntries = fragment
      .getParts()
      .filter((part) => part.getIndex() === this.partIndex)
      .flatMap((fragmentPart) => fragmentPart.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries());

    const bpm = fragment.getBpm();

    for (const voiceEntry of voiceEntries) {
      const duration = this.toDuration(voiceEntry.getBeatCount(), bpm);
      // NOTE: getStartMeasureBeat() is relative to the start of the measure.
      const startTime = this.currentMeasureStartTime.add(this.toDuration(voiceEntry.getStartMeasureBeat(), bpm));
      const stopTime = startTime.add(duration);

      this.addTransitionStartEvent(startTime, voiceEntry);
      this.addTransitionStopEvent(stopTime, voiceEntry);

      this.proposeNextMeasureStartTime(stopTime);
    }
  }

  private sortEvents(): void {
    this.events.sort((a, b) => {
      if (a.type === b.type) {
        return a.time.compare(b.time);
      }
      const typeOrder = { transition: 0, jump: 1, systemend: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }

  private simplifyEvents(): void {
    const merged = new Array<TimelineEvent>();

    const transitions = new Map<number, TransitionEvent>();

    for (const event of this.events) {
      if (event.type === 'transition') {
        if (transitions.has(event.time.ms)) {
          transitions.get(event.time.ms)!.transitions.push(...event.transitions);
        } else {
          transitions.set(event.time.ms, event);
          merged.push(event);
        }
      } else {
        merged.push(event);
      }
    }

    this.events = merged;
  }

  private sortTransitions(): void {
    for (const event of this.events) {
      if (event.type === 'transition') {
        event.transitions.sort((a, b) => {
          const typeOrder = { stop: 0, start: 1 };
          return typeOrder[a.type] - typeOrder[b.type];
        });
      }
    }
  }

  private addTransitionStartEvent(time: Duration, element: PlaybackElement): void {
    this.events.push({
      type: 'transition',
      time,
      transitions: [{ type: 'start', element }],
    });
  }

  private addTransitionStopEvent(time: Duration, element: PlaybackElement): void {
    this.events.push({
      type: 'transition',
      time,
      transitions: [{ type: 'stop', element }],
    });
  }

  private addJumpEvent(time: Duration): void {
    this.events.push({ type: 'jump', time });
  }

  private addSystemEndEvent(time: Duration): void {
    this.events.push({ type: 'systemend', time });
  }
}
