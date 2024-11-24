export class NumberRange {
  private left: Bound;
  private right: Bound;

  constructor(left: Bound, right: Bound) {
    if (left.value > right.value) {
      throw new Error('Invalid range: left bound must be less than or equal to right bound.');
    }
    this.left = left;
    this.right = right;
  }

  static fromInclusive(left: number): PartialNumberRange {
    return new PartialNumberRange(Bound.inclusive(left));
  }

  static fromExclusive(left: number): PartialNumberRange {
    return new PartialNumberRange(Bound.exclusive(left));
  }

  getLeft(): number {
    return this.left.value;
  }

  getRight(): number {
    return this.right.value;
  }

  contains(value: number): boolean {
    let leftCheck: boolean;
    switch (this.left.type) {
      case 'inclusive':
        leftCheck = value >= this.left.value;
        break;
      case 'exclusive':
        leftCheck = value > this.left.value;
        break;
    }

    let rightCheck: boolean;
    switch (this.right.type) {
      case 'inclusive':
        rightCheck = value <= this.right.value;
        break;
      case 'exclusive':
        rightCheck = value < this.right.value;
        break;
    }

    return leftCheck && rightCheck;
  }

  overlaps(range: NumberRange): boolean {
    return (
      this.contains(range.left.value) ||
      this.contains(range.right.value) ||
      range.contains(this.left.value) ||
      range.contains(this.right.value)
    );
  }
}

class PartialNumberRange {
  private left: Bound;

  constructor(left: Bound) {
    this.left = left;
  }

  toInclusive(right: number): NumberRange {
    return new NumberRange(this.left, Bound.inclusive(right));
  }

  toExclusive(right: number): NumberRange {
    return new NumberRange(this.left, Bound.exclusive(right));
  }
}

type BoundType = 'inclusive' | 'exclusive';

class Bound {
  public readonly value: number;
  public readonly type: BoundType;

  private constructor(value: number, type: BoundType) {
    this.value = value;
    this.type = type;
  }

  static inclusive(value: number): Bound {
    return new Bound(value, 'inclusive');
  }

  static exclusive(value: number): Bound {
    return new Bound(value, 'exclusive');
  }
}
