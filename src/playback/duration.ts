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

  private readonly _ms: number;

  private constructor(ms: number) {
    this._ms = ms;
  }

  eq(duration: Duration) {
    return this.ms === duration.ms;
  }

  plus(duration: Duration) {
    return Duration.ms(duration.ms + this.ms);
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
