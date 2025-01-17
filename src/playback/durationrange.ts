import * as util from '@/util';
import { Duration } from './duration';

export class DurationRange {
  private numberRange: util.NumberRange;

  constructor(start: Duration, end: Duration) {
    this.numberRange = new util.NumberRange(start.ms, end.ms);
  }

  public get start(): Duration {
    return Duration.ms(this.numberRange.start);
  }

  public get end(): Duration {
    return Duration.ms(this.numberRange.end);
  }

  getSize(): Duration {
    return Duration.ms(this.numberRange.getSize());
  }

  includes(duration: Duration): boolean {
    return this.numberRange.includes(duration.ms);
  }
}
