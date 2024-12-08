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

  locate(timeMs: number): number | null {
    if (timeMs < 0) {
      return 0;
    }

    if (timeMs > this.sequence.getDurationMs()) {
      return this.sequence.getLength() - 1;
    }

    const previousIndex = this.index - 1;
    if (this.sequence.getEntry(previousIndex)?.tickRange.includes(timeMs)) {
      return previousIndex;
    }

    const currentIndex = this.index;
    if (this.sequence.getEntry(currentIndex)?.tickRange.includes(timeMs)) {
      return currentIndex;
    }

    const nextIndex = this.index + 1;
    if (this.sequence.getEntry(nextIndex)?.tickRange.includes(timeMs)) {
      return nextIndex;
    }

    return null;
  }
}
