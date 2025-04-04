import * as util from '@/util';
import { CursorFrameLocator } from './types';
import { Duration } from './duration';
import { CursorPath } from './cursorpath';

/**
 * A CursorFrameLocator that uses binary search to locate the frame at a given time.
 */
export class BSearchCursorFrameLocator implements CursorFrameLocator {
  constructor(private path: CursorPath) {}

  locate(time: Duration): number | null {
    const frames = this.path.getFrames();

    let left = 0;
    let right = frames.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const entry = frames.at(mid);

      util.assertDefined(entry);

      if (entry.tRange.includes(time)) {
        return mid;
      }

      if (entry.tRange.end.isGreaterThanOrEqual(time)) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }
}
