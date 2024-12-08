import * as playback from '@/playback';

export class CheapLocator {
  private sequence: playback.Sequence;
  private index: number = 0;

  constructor(sequence: playback.Sequence) {
    this.sequence = sequence;
  }

  setIndex(index: number): this {
    this.index = index;
    return this;
  }

  locate(time: playback.Duration): number | null {
    if (time.lt(playback.Duration.zero())) {
      return 0;
    }

    if (time.gt(this.sequence.getDuration())) {
      return this.sequence.getLength() - 1;
    }

    const previousIndex = this.index - 1;
    if (this.sequence.getEntry(previousIndex)?.durationRange.includes(time)) {
      return previousIndex;
    }

    const currentIndex = this.index;
    if (this.sequence.getEntry(currentIndex)?.durationRange.includes(time)) {
      return currentIndex;
    }

    const nextIndex = this.index + 1;
    if (this.sequence.getEntry(nextIndex)?.durationRange.includes(time)) {
      return nextIndex;
    }

    return null;
  }
}
