import * as rendering from '@/rendering';
import { Duration } from './duration';

export type Step = {
  start: Duration;
  end: Duration;
  repeat: number;
  voiceEntry: rendering.VoiceEntryRendering;
};

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private steps: Step[];

  private constructor(partId: string, steps: Step[]) {
    this.partId = partId;
    this.steps = steps;
  }

  static fromScore(score: rendering.ScoreRendering): Sequence[] {
    return score.systems
      .flatMap((system) => system.measures)
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .map((part) => {
        const steps = part.staves
          .flatMap((stave) => stave.entry)
          .flatMap((entry) => (entry.type === 'chorus' ? entry.voices : []))
          .flatMap((voice) => voice.entries)
          .map((entry) => ({
            start: Duration.zero(),
            end: Duration.zero(),
            repeat: 0,
            voiceEntry: entry,
          }));

        return new Sequence(part.id, steps);
      });
  }

  get length() {
    return this.steps.length;
  }

  at(index: number): Step | null {
    return this.steps[index] ?? null;
  }

  getPartId(): string {
    return this.partId;
  }
}
