export class Stopwatch {
  private start = performance.now();

  private constructor() {}

  static start(): Stopwatch {
    return new Stopwatch();
  }

  lap(): number {
    const now = performance.now();
    const result = now - this.start;
    this.start = now;
    return result;
  }
}
