import * as util from '@/util';
import { Step } from './step';
import { Duration } from './duration';

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private steps: Step[];

  constructor(builder: SequenceBuilder) {
    this.steps = builder.steps;
  }

  static builder() {
    return new SequenceBuilder();
  }

  get length() {
    return this.steps.length;
  }

  at(index: number): Step | null {
    return this.steps[index] ?? null;
  }
}

/** A builder for creating a valid sequence of steps. */
export class SequenceBuilder {
  public readonly steps = new Array<Step>();

  addStep(step: Step): this {
    this.validate(step);
    this.steps.push(step);
    return this;
  }

  build() {
    return new Sequence(this);
  }

  private validate(step: Step) {
    const prev = util.last(this.steps);

    if (prev && !prev.end.eq(step.start)) {
      throw new Error('Step end must be equal to the next step start');
    }

    if (!prev && !step.start.eq(Duration.zero())) {
      throw new Error('First step must start at 0');
    }
  }
}
