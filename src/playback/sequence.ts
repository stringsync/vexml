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
  private steps: Step[];

  private constructor(steps: Step[]) {
    this.steps = steps;
  }

  static create(score: rendering.ScoreRendering): Sequence {
    const steps = new Array<Step>();

    score.systems
      .flatMap((system) => system.measures)
      .flatMap((measure) => measure.fragments)
      .flatMap((fragment) => fragment.parts)
      .flatMap((part) => part.staves)
      .flatMap((stave) => stave.entry)
      .flatMap((entry) => (entry.type === 'chorus' ? entry.voices : []))
      .flatMap((voice) => voice.entries);

    return new Sequence(steps);
  }

  get length() {
    return this.steps.length;
  }

  at(index: number): Step | null {
    return this.steps[index] ?? null;
  }
}
