import * as playback from '@/playback';
import * as util from '@/util';

export class ExpensiveLocator {
  private sequence: playback.Sequence;

  constructor(sequence: playback.Sequence) {
    this.sequence = sequence;
  }

  locate(time: playback.Duration): number | null {
    let left = 0;
    let right = this.sequence.getCount() - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const entry = this.sequence.getEntry(mid);

      util.assertNotNull(entry);

      if (entry.durationRange.includes(time)) {
        return mid;
      }

      if (entry.durationRange.getEnd().gteq(time)) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }
}
