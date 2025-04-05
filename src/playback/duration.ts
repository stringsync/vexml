// Conversions to milliseconds
const ms = (v: number) => v;
const sec = (v: number) => ms(v * 1000);
const min = (v: number) => sec(v * 60);

export class Duration {
  static zero() {
    return new Duration(0);
  }

  static ms(v: number) {
    return new Duration(ms(v));
  }

  static sec(v: number) {
    return new Duration(sec(v));
  }

  static minutes(v: number) {
    return new Duration(min(v));
  }

  static sum(durations: Duration[]) {
    return Duration.ms(durations.reduce((acc, duration) => acc + duration.ms, 0));
  }

  static max(...durations: Duration[]): Duration {
    return Duration.ms(Math.max(...durations.map((duration) => duration.ms)));
  }

  private readonly _ms: number;

  private constructor(ms: number) {
    this._ms = ms;
  }

  isEqual(duration: Duration) {
    return this.ms === duration.ms;
  }

  add(duration: Duration) {
    return Duration.ms(duration.ms + this.ms);
  }

  isGreaterThan(duration: Duration) {
    return this.ms > duration.ms;
  }

  isGreaterThanOrEqual(duration: Duration) {
    return this.ms >= duration.ms;
  }

  isLessThan(duration: Duration) {
    return this.ms < duration.ms;
  }

  isLessThanOrEqualTo(duration: Duration) {
    return this.ms <= duration.ms;
  }

  compare(duration: Duration): -1 | 0 | 1 {
    if (this.isLessThan(duration)) {
      return -1;
    }
    if (this.isGreaterThan(duration)) {
      return 1;
    }
    return 0;
  }

  get ms() {
    return this._ms;
  }

  get sec() {
    return this.ms / 1000;
  }

  get minutes() {
    return this.sec / 60;
  }
}
