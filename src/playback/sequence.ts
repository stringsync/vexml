import * as rendering from '@/rendering';

type VoiceEntryInteraction = Exclude<
  rendering.InteractionModelType,
  rendering.InteractionModel<rendering.MeasureRendering>
>;

type MeasureInteraction = rendering.InteractionModel<rendering.MeasureRendering>;

type Interaction = {
  voiceEntry: VoiceEntryInteraction;
  measure: MeasureInteraction;
};

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private voiceEntryInteractions: VoiceEntryInteraction[];
  private measureInteractions: MeasureInteraction[];

  private constructor(
    partId: string,
    voiceEntryInteractions: VoiceEntryInteraction[],
    measureInteractions: MeasureInteraction[]
  ) {
    this.partId = partId;
    this.voiceEntryInteractions = voiceEntryInteractions;
    this.measureInteractions = measureInteractions;
  }

  static fromScoreRendering(score: rendering.ScoreRendering): Sequence[] {
    const renderings = rendering.Query.of(score).select('interactable');
    const interactions = rendering.InteractionModel.create(renderings);

    const voiceEntryInteractions = interactions.filter(
      (interaction): interaction is VoiceEntryInteraction => interaction.value.type !== 'measure'
    );
    const measureInteractions = interactions.filter(
      (interaction): interaction is MeasureInteraction => interaction.value.type === 'measure'
    );

    return score.partIds.map((partId) => {
      return new Sequence(
        partId,
        voiceEntryInteractions.filter((interaction) => interaction.value.address.getPartId() === partId),
        measureInteractions
      );
    });
  }

  getInteraction(index: number): Interaction | null {
    const voiceEntry = this.voiceEntryInteractions[index];
    if (!voiceEntry) {
      return null;
    }

    const measureIndex = voiceEntry.value.address.getMeasureIndex();
    if (typeof measureIndex !== 'number') {
      return null;
    }

    const measure = this.measureInteractions[measureIndex];
    if (!measure) {
      return null;
    }

    return { voiceEntry, measure };
  }

  getVoiceEntryInteractions() {
    return this.voiceEntryInteractions;
  }

  getMeasureInteractions() {
    return this.measureInteractions;
  }

  getLength() {
    return this.voiceEntryInteractions.length;
  }

  getPartId(): string {
    return this.partId;
  }
}
