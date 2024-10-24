import * as rendering from '@/rendering';
import { InteractionModelType } from './types';

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private interactions: InteractionModelType[];

  private constructor(partId: string, interactions: InteractionModelType[]) {
    this.partId = partId;
    this.interactions = interactions;
  }

  static fromScoreRendering(score: rendering.ScoreRendering): Sequence[] {
    const interactions = rendering.InteractionModel.create(score).filter(
      (interaction): interaction is InteractionModelType => interaction.value.type !== 'measure'
    );

    return score.partIds.map((partId) => {
      return new Sequence(
        partId,
        interactions.filter((interaction) => interaction.value.address.getPartId() === partId)
      );
    });
  }

  at(index: number): InteractionModelType | null {
    return this.interactions[index] ?? null;
  }

  getInteractions() {
    return this.interactions;
  }

  getLength() {
    return this.interactions.length;
  }

  getPartId(): string {
    return this.partId;
  }
}
