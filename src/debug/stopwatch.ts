export class Stopwatch {
  private start = performance.now();

  private constructor() {}

  static start(): Stopwatch {
    return new Stopwatch();
  }

  lap(): number {
    return performance.now() - this.start;
  }
}
