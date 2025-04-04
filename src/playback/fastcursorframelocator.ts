import { CursorPath } from './cursorpath';
import { Duration } from './duration';
import { CursorFrameLocator } from './types';

/**
 * A CursorFrameLocator that uses O(1) time complexity to locate the frame at a given time before falling back to a more
 * expensive locator.
 */
export class FastCursorFrameLocator implements CursorFrameLocator {
  private index = 0;

  constructor(private path: CursorPath, private fallback: CursorFrameLocator) {}

  locate(time: Duration): number | null {
    const frames = this.path.getFrames();

    if (time.isLessThan(Duration.zero())) {
      return this.update(0);
    }

    if (time.isGreaterThan(this.getDuration())) {
      return this.update(frames.length - 1);
    }

    const previousIndex = this.index - 1;
    if (previousIndex >= 0 && frames.at(previousIndex)?.tRange.includes(time)) {
      return this.update(previousIndex);
    }

    const currentIndex = this.index;
    if (frames.at(currentIndex)?.tRange.includes(time)) {
      return this.update(currentIndex);
    }

    const nextIndex = this.index + 1;
    if (frames.at(nextIndex)?.tRange.includes(time)) {
      return this.update(nextIndex);
    }

    const index = this.fallback.locate(time);
    if (typeof index === 'number') {
      return this.update(index);
    }

    this.update(0);

    return null;
  }

  private update(index: number): number {
    this.index = index;
    return index;
  }

  private getDuration(): Duration {
    return this.path.getFrames().at(-1)?.tRange.end ?? Duration.zero();
  }
}
