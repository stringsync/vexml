import * as rendering from '@/rendering';
import * as util from '@/util';

type PlayableInteraction = rendering.InteractionModel<rendering.PlayableRendering>;

type StaveInteraction = rendering.InteractionModel<rendering.StaveRendering>;

type SequenceEntry = {
  playableInteraction: PlayableInteraction;
  tickRange: util.NumberRange;
  voices: {
    [voiceId: string]: PlayableInteraction;
  };
  system: {
    staveInteractions: StaveInteraction[];
    playableInteractions: PlayableInteraction[];
  };
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
      // Group playable renderings by voice ID, preserving the order that the playables appear in.
      const playables = rendering.Query.of(score).where(rendering.Query.forPart(partId)).getPlayables();
      const voiceIds = new Array<string>();
      const playablesByVoiceId: { [voiceId: string]: rendering.PlayableRendering[] } = {};
      for (const playable of playables) {
        const voiceId = playable.address.getVoiceId();
        if (typeof voiceId !== 'string') {
          throw new Error(`Expected voice ID to be a string, got: ${voiceId}`);
        }

        if (!voiceIds.includes(voiceId)) {
          voiceIds.push(voiceId);
        }

        playablesByVoiceId[voiceId] ??= [];
        playablesByVoiceId[voiceId].push(playable);
      }

      // TODO: Go through each voice and create sequence entries.

      return new Sequence(partId, []);
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
