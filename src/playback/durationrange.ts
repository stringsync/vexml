import * as util from '@/util';
import { Duration } from './duration';

export class DurationRange {
  private numberRange: util.NumberRange;

  constructor(left: Duration, right: Duration) {
    this.numberRange = new util.NumberRange(left.ms, right.ms);
  }

  getLeft(): Duration {
    return Duration.ms(this.numberRange.getLeft());
  }

  getRight(): Duration {
    return Duration.ms(this.numberRange.getRight());
  }

  includes(duration: Duration): boolean {
    return this.numberRange.includes(duration.ms);
  }
}
