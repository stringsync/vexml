export class NumberRange {
  private left: number;
  private right: number;

  constructor(left: number, right: number) {
    if (left > right) {
      throw new Error('Invalid range: left bound must be less than or equal to right bound.');
    }
    this.left = left;
    this.right = right;
  }

  getLeft(): number {
    return this.left;
  }

  getRight(): number {
    return this.right;
  }

  getSize(): number {
    return this.right - this.left;
  }

  includes(value: number): boolean {
    return value >= this.left && value <= this.right;
  }

  contains(range: NumberRange): boolean {
    return this.includes(range.left) && this.includes(range.right);
  }

  overlaps(range: NumberRange): boolean {
    return (
      this.includes(range.left) || this.includes(range.right) || range.includes(this.left) || range.includes(this.right)
    );
  }
}
