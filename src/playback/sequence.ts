import * as rendering from '@/rendering';
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
  // We need to add this type to the list of playable rendering types so that we can account for ghost notes when
  // calculating the number of ticks. We shouldn't try to interact with this after.
  'ghostnote',
] as const;

export type PlayableRendering = rendering.SelectableRenderingWithType<(typeof PLAYABLE_RENDERING_TYPES)[number]>;

type SequenceEventType = 'start' | 'stop';

type SequenceEvent = {
  type: SequenceEventType;
  time: Duration;
  interactable: rendering.InteractableRendering;
};

export type SequenceEntry = {
  interactables: rendering.InteractableRendering[];
  durationRange: DurationRange;
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
      const voiceIds = rendering.Query.of(score)
        .where(rendering.filters.forPart(partId))
        .select('voice')
        .map((voice) => voice.id);

      // Materialize sequence events.
      const events = new Array<SequenceEvent>();
      for (const voiceId of voiceIds) {
        const playables = rendering.Query.of(score)
          .withMeasureSequence((measures) => new MeasureSequenceIterator(measures))
          .where(rendering.filters.forPart(partId))
          .where(rendering.filters.forVoice(voiceId))
          .select(...PLAYABLE_RENDERING_TYPES);

        let time = Duration.zero();
        for (const playable of playables) {
          const measureIndex = playable.address.getMeasureIndex()!;
          const bpm = measures[measureIndex].bpm;
          const tickConverter = new TickConverter(bpm);

          const ticks = getTicks(playable);

          const duration = tickConverter.toDuration(ticks);
          const start = time;
          const stop = duration.plus(duration);

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      util.forEachTriple(events, ([previousEvent, currentEvent, nextEvent]) => {
        if (currentEvent.type === 'start') {
          interactables.unshift(currentEvent.interactable);
        }

        if (currentEvent.type === 'stop') {
          interactables.splice(interactables.indexOf(currentEvent.interactable), 1);
        }

        if (nextEvent && time.eq(currentEvent.time)) {
          const start = time;
          const stop = nextEvent.time;
          const durationRange = new DurationRange(start, stop);
          time = stop;
          entries.push({ interactables: [...interactables], durationRange });
        }
      });

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
    return util.last(this.entries)?.durationRange.getRight() ?? Duration.zero();
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
  }
}

function isInteractable(value: any): value is rendering.InteractableRendering {
  return rendering.INTERACTABLE_RENDERING_TYPES.includes(value.type);
}
