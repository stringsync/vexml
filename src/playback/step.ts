import { Duration } from './duration';

export class Step {
  public readonly start: Duration;
  public readonly end: Duration;

  constructor(opts: { start: Duration; end: Duration }) {
    this.start = opts.start;
    this.end = opts.end;
  }
}
