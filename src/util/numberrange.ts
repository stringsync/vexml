export class NumberRange {
  public readonly start: number;
  public readonly end: number;

  constructor(start: number, end: number) {
    if (start > end) {
      throw new Error('Invalid range: start bound must be less than or equal to end bound.');
    }
    this.start = start;
    this.end = end;
  }

  getSize(): number {
    return this.end - this.start;
  }

  includes(value: number): boolean {
    return value >= this.start && value <= this.end;
  }

  contains(range: NumberRange): boolean {
    return this.includes(range.start) && this.includes(range.end);
  }

  overlaps(range: NumberRange): boolean {
    return (
      this.includes(range.start) || this.includes(range.end) || range.includes(this.start) || range.includes(this.end)
    );
  }
}
