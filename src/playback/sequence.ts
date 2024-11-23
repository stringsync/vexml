import * as rendering from '@/rendering';

type PlayableInteraction = rendering.InteractionModel<rendering.PlayableRendering>;

type StaveInteraction = rendering.InteractionModel<rendering.StaveRendering>;

type SequenceEntry = {
  playableInteraction: PlayableInteraction;
  system: {
    staveInteractions: StaveInteraction[];
    playableInteractions: PlayableInteraction[];
  };
};

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private playableInteractions: PlayableInteraction[];
  private staveInteractions: StaveInteraction[];

  private constructor(
    partId: string,
    playableInteractions: PlayableInteraction[],
    staveInteractions: StaveInteraction[]
  ) {
    this.partId = partId;
    this.playableInteractions = playableInteractions;
    this.staveInteractions = staveInteractions;
  }

  static fromScoreRendering(score: rendering.ScoreRendering): Sequence[] {
    return score.partIds.map((partId) => {
      const forPart = rendering.Query.forPart(partId);

      const playables = rendering.Query.of(score).where(forPart).playables();
      const playableInteractions = rendering.InteractionModel.create(playables);

      const staves = rendering.Query.of(score).where(forPart).staves();
      const staveInteractions = rendering.InteractionModel.create(staves);

      return new Sequence(partId, playableInteractions, staveInteractions);
    });
  }

  getEntry(index: number): SequenceEntry | null {
    const playableInteraction = this.playableInteractions[index];
    if (!playableInteraction) {
      return null;
    }

    const systemIndex = playableInteraction.value.address.getSystemIndex();
    if (typeof systemIndex !== 'number') {
      return null;
    }

    const systemPlayableInteractions = this.playableInteractions.filter(
      (playableInteraction) => playableInteraction.value.address.getSystemIndex() === systemIndex
    );

    const systemStaveInteractions = this.staveInteractions.filter(
      (staveInteraction) => staveInteraction.value.address.getSystemIndex() === systemIndex
    );

    return {
      playableInteraction,
      system: {
        staveInteractions: systemStaveInteractions,
        playableInteractions: systemPlayableInteractions,
      },
    };
  }

  getPlayableInteraction(index: number): PlayableInteraction {
    return this.playableInteractions[index];
  }

  getLength() {
    return this.playableInteractions.length;
  }

  getPartId(): string {
    return this.partId;
  }
}
