import * as playback from '@/playback';
import * as util from '@/util';

export class ExpensiveLocator {
  private sequence: playback.Sequence;

  constructor(sequence: playback.Sequence) {
    this.sequence = sequence;
  }

  locate(timeMs: number): number | null {
    let left = 0;
    let right = this.sequence.getLength() - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const entry = this.sequence.getEntry(mid);

      util.assertNotNull(entry);

      if (entry.tickRange.includes(timeMs)) {
        return mid;
      }

      if (entry.tickRange.getLeft() <= timeMs) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }
}
