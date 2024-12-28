import * as rendering from '@/legacyrendering';
import * as util from '@/util';
import { MeasureSequenceIterator } from './measuresequenceiterator';
import { TickConverter } from './tickconverter';
import { Duration } from './duration';
import { DurationRange } from './durationrange';

export const PLAYABLE_RENDERING_TYPES = [
  'stavenote',
  'stavechord',
  'gracenote',
  'gracechord',
  'tabnote',
  'tabchord',
  'tabgracenote',
  'tabgracechord',
  'rest',
  'measure',
  // We need to add this type to the list of playable rendering types so that we can account for ghost notes when
  // calculating the number of ticks. We shouldn't try to interact with this after.
  'ghostnote',
] as const;

const LAST_MEASURE_XRANGE_PADDING = 6;

export type PlayableRendering = rendering.SelectableRenderingWithType<(typeof PLAYABLE_RENDERING_TYPES)[number]>;

type SequenceEventType = 'start' | 'stop';

type SequenceEvent = {
  type: SequenceEventType;
  time: Duration;
  interactable: rendering.InteractableRendering;
};

export type SequenceEntry = {
  mostRecentInteractable: rendering.InteractableRendering;
  interactables: rendering.InteractableRendering[];
  durationRange: DurationRange;
  xRange: util.NumberRange;
};

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private entries: SequenceEntry[];

  private constructor(partId: string, entries: SequenceEntry[]) {
    this.partId = partId;
    this.entries = entries;
  }

  static fromScoreRendering(score: rendering.ScoreRendering): Sequence[] {
    // Collect all the measures in the score for bpm data.
    const measures = rendering.Query.of(score).select('measure');

    return score.partIds.map((partId) => {
      // Collect the voice IDs in the part.
      const voiceIds = util.unique(
        rendering.Query.of(score)
          .where(rendering.filters.forPart(partId))
          .select('voice')
          .map((voice) => voice.id)
      );

      // Materialize sequence events.
      const events = new Array<SequenceEvent>();
      for (const voiceId of voiceIds) {
        const playables = rendering.Query.of(score)
          .withMeasureSequence((measures) => new MeasureSequenceIterator(measures))
          .where(rendering.filters.forPart(partId))
          .where(rendering.filters.forVoice(voiceId))
          .select(...PLAYABLE_RENDERING_TYPES)
          .filter((playable) => {
            if (playable.type !== 'measure') {
              // Accept all playables that are not measures.
              return true;
            }
            // Otherwise, only accept measures that have a gap.
            return playable.gap;
          });

        let time = Duration.zero();
        for (const playable of playables) {
          const measureIndex = playable.address.getMeasureIndex()!;
          const bpm = measures[measureIndex].bpm;
          const tickConverter = new TickConverter(bpm);
          const duration = getDuration(playable, tickConverter);

          const start = time;
          const stop = time.plus(duration);

          if (isInteractable(playable)) {
            events.push({ type: 'start', time: start, interactable: playable });
            events.push({ type: 'stop', time: stop, interactable: playable });
          }

          time = stop;
        }
      }
      events.sort((a, b) => a.time.ms - b.time.ms);

      // Materialize sequence entries.
      const interactables = new Array<rendering.InteractableRendering>();
      const entries = new Array<SequenceEntry>();
      let time = Duration.zero();
      let mostRecentInteractable: rendering.InteractableRendering | null = null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      util.forEachTriple(events, ([previousEvent, currentEvent, nextEvent]) => {
        if (currentEvent.type === 'start') {
          mostRecentInteractable = currentEvent.interactable;
          interactables.unshift(currentEvent.interactable);
        }

        if (currentEvent.type === 'stop') {
          interactables.splice(interactables.indexOf(currentEvent.interactable), 1);
        }

        if (nextEvent && interactables.length > 0) {
          const start = time;
          const stop = nextEvent.time;
          const durationRange = new DurationRange(start, stop);
          time = stop;
          util.assertNotNull(mostRecentInteractable);
          // For now, the xRange will be initialized to be empty. After we've materialized all the sequence entries, we
          // will go back and fill in the xRange values.
          const xRange = new util.NumberRange(0, 0);
          entries.push({
            mostRecentInteractable,
            interactables: [...interactables],
            durationRange,
            xRange,
          });
        }
      });

      const measureRects = measures.map((measure) => ({
        index: measure.index,
        rect: rendering.InteractionModel.create(measure).getBoundingBox(),
      }));

      const entryRects = entries.map((entry) =>
        rendering.InteractionModel.create(entry.mostRecentInteractable).getBoundingBox()
      );

      // Fix the xRange values, now that we can look ahead easily.
      for (let index = 0; index < entries.length; index++) {
        const currentEntry = entries[index];
        const currentEntryCenterX = entryRects[index].center().x;
        const currentMeasureIndex = currentEntry.mostRecentInteractable.address.getMeasureIndex()!;
        const currentMeasureEndX = measureRects[currentMeasureIndex].rect.getMaxX();

        const isLast = index === entries.length - 1;
        if (isLast) {
          currentEntry.xRange = new util.NumberRange(
            currentEntryCenterX,
            currentMeasureEndX - LAST_MEASURE_XRANGE_PADDING
          );
          continue;
        }

        const nextEntry = entries[index + 1];
        const nextEntryCenterX = entryRects[index + 1].center().x;

        const isFirst = index === 0;
        const isCurrentGap = currentEntry.mostRecentInteractable.type === 'measure';
        if (isCurrentGap && isFirst) {
          const currentMeasureRect = measureRects[currentMeasureIndex].rect;
          currentEntry.xRange = new util.NumberRange(currentMeasureRect.center().x, nextEntryCenterX);
          continue;
        }
        if (isCurrentGap && !isFirst) {
          const currentMeasureRect = measureRects[currentMeasureIndex].rect;
          currentEntry.xRange = new util.NumberRange(currentMeasureRect.getMinX(), nextEntryCenterX);
          continue;
        }

        const currentSystemIndex = currentEntry.mostRecentInteractable.address.getSystemIndex()!;
        const nextSystemIndex = nextEntry.mostRecentInteractable.address.getSystemIndex()!;

        const isChangingSystems = currentSystemIndex !== nextSystemIndex;
        if (isChangingSystems) {
          currentEntry.xRange = new util.NumberRange(currentEntryCenterX, currentMeasureEndX);
          continue;
        }

        // This can happen if there is a repeat range that spans a single measure and the measure only has one
        // interactable.
        const isRepeatingTheSameNote = currentEntry.mostRecentInteractable === nextEntry.mostRecentInteractable;
        if (isRepeatingTheSameNote) {
          currentEntry.xRange = new util.NumberRange(currentEntryCenterX, currentMeasureEndX);
          continue;
        }

        const nextMeasureIndex = nextEntry.mostRecentInteractable.address.getMeasureIndex()!;

        // This will happen if there's a jump in the sequence.
        const isChangingMeasures = currentMeasureIndex !== nextMeasureIndex;
        const isJumpingMeasures = currentMeasureIndex !== nextMeasureIndex - 1;
        if (isChangingMeasures && isJumpingMeasures) {
          currentEntry.xRange = new util.NumberRange(currentEntryCenterX, currentMeasureEndX);
          continue;
        }

        const isGoingBackwards = currentEntryCenterX > nextEntryCenterX;
        if (isGoingBackwards) {
          currentEntry.xRange = new util.NumberRange(currentEntryCenterX, currentMeasureEndX);
          continue;
        }

        const isGapNext = nextEntry.mostRecentInteractable.type === 'measure';
        if (isGapNext) {
          currentEntry.xRange = new util.NumberRange(currentEntryCenterX, currentMeasureEndX);
          continue;
        }

        // Otherwise, deduce that the next entry is on the same system and is moving forward normally.
        currentEntry.xRange = new util.NumberRange(currentEntryCenterX, nextEntryCenterX);
      }

      return new Sequence(partId, entries);
    });
  }

  getEntry(index: number): SequenceEntry | null {
    return this.entries[index] ?? null;
  }

  getLength() {
    return this.entries.length;
  }

  getPartId(): string {
    return this.partId;
  }

  getDuration(): Duration {
    return util.last(this.entries)?.durationRange.getEnd() ?? Duration.zero();
  }
}

function getDuration(playable: PlayableRendering, tickConverter: TickConverter): Duration {
  if (playable.type === 'measure') {
    util.assertNotNull(playable.gap);
    return Duration.ms(playable.gap.durationMs);
  } else {
    const ticks = getTicks(playable);
    return tickConverter.toDuration(ticks);
  }
}

function getTicks(playable: PlayableRendering): number {
  switch (playable.type) {
    case 'stavenote':
      return util.Fraction.fromFractionLike(playable.vexflow.staveNote.getTicks()).toDecimal();
    case 'stavechord':
      return util.Fraction.fromFractionLike(playable.notes[0].vexflow.staveNote.getTicks()).toDecimal();
    case 'gracenote':
      return util.Fraction.fromFractionLike(playable.vexflow.graceNote.getTicks()).toDecimal();
    case 'gracechord':
      return util.Fraction.fromFractionLike(playable.graceNotes[0].vexflow.graceNote.getTicks()).toDecimal();
    case 'tabnote':
      return util.Fraction.fromFractionLike(playable.vexflow.tabNote.getTicks()).toDecimal();
    case 'tabchord':
      return util.Fraction.fromFractionLike(playable.tabNotes[0].vexflow.tabNote.getTicks()).toDecimal();
    case 'tabgracenote':
      return util.Fraction.fromFractionLike(playable.vexflow.graceTabNote.getTicks()).toDecimal();
    case 'tabgracechord':
      return util.Fraction.fromFractionLike(playable.tabGraceNotes[0].vexflow.graceTabNote.getTicks()).toDecimal();
    case 'rest':
      return util.Fraction.fromFractionLike(playable.vexflow.note.getTicks()).toDecimal();
    case 'ghostnote':
      return util.Fraction.fromFractionLike(playable.vexflow.ghostNote.getTicks()).toDecimal();
    case 'measure':
      throw new Error('Cannot get ticks for a measure.');
  }
}

function isInteractable(value: any): value is rendering.InteractableRendering {
  return rendering.INTERACTABLE_RENDERING_TYPES.includes(value.type);
}
