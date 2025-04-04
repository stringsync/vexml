import * as util from '@/util';
import { CursorFrame } from './cursorframe';
import { CursorFrameLocator } from './types';
import { Duration } from './duration';

/**
 * A CursorFrameLocator that uses binary search to locate the frame at a given time.
 */
export class BSearchCursorFrameLocator implements CursorFrameLocator {
  constructor(private frames: CursorFrame[]) {}

  locate(time: Duration): number | null {
    let left = 0;
    let right = this.frames.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const entry = this.frames.at(mid);

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
