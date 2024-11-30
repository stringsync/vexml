import * as rendering from '@/rendering';
import * as util from '@/util';

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
  tick: number;
  interactable: rendering.InteractableRendering;
};

export type SequenceEntry = {
  interactables: rendering.InteractableRendering[];
  tickRange: util.NumberRange;
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
          .where(rendering.filters.forPart(partId))
          .where(rendering.filters.forVoice(voiceId))
          .select(...PLAYABLE_RENDERING_TYPES);

        let ticks = 0;
        for (const playable of playables) {
          const startTicks = ticks;
          const stopTicks = ticks + getTicks(playable);

          if (isInteractable(playable)) {
            events.push({ type: 'start', tick: startTicks, interactable: playable });
            events.push({ type: 'stop', tick: stopTicks, interactable: playable });
          }

          ticks = stopTicks;
        }
      }
      events.sort((a, b) => a.tick - b.tick);

      // Materialize sequence entries.
      const interactables = new Array<rendering.InteractableRendering>();
      const entries = new Array<SequenceEntry>();
      let tick = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      util.forEachTriple(events, ([previousEvent, currentEvent, nextEvent]) => {
        if (currentEvent.type === 'start') {
          interactables.unshift(currentEvent.interactable);
        }

        if (currentEvent.type === 'stop') {
          interactables.splice(interactables.indexOf(currentEvent.interactable), 1);
        }

        if (nextEvent && tick !== nextEvent.tick) {
          const startTick = tick;
          const stopTick = nextEvent.tick;
          const tickRange = new util.NumberRange(startTick, stopTick);
          tick = stopTick;
          entries.push({ interactables: [...interactables], tickRange });
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
  return PLAYABLE_RENDERING_TYPES.includes(value.type);
}
