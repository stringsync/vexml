import { NumberRange } from '@/util/numberrange';

describe(NumberRange, () => {
  it('should create a valid range with inclusive bounds', () => {
    const range = NumberRange.fromInclusive(1).toInclusive(5);
    expect(range.getLeft()).toBe(1);
    expect(range.getRight()).toBe(5);
  });

  it('should create a valid range with exclusive bounds', () => {
    const range = NumberRange.fromExclusive(1).toExclusive(5);
    expect(range.getLeft()).toBe(1);
    expect(range.getRight()).toBe(5);
  });

  it('should throw an error if left bound is greater than right bound', () => {
    expect(() => {
      NumberRange.fromInclusive(5).toInclusive(1);
    }).toThrow('Invalid range: left bound must be less than or equal to right bound.');
  });

  it('should check if a value is within the range', () => {
    const range = NumberRange.fromInclusive(1).toInclusive(5);
    expect(range.contains(3)).toBeTrue();
    expect(range.contains(0)).toBeFalse();
  });

  it('should check if two ranges overlap', () => {
    const range1 = NumberRange.fromInclusive(1).toInclusive(5);
    const range2 = NumberRange.fromInclusive(4).toInclusive(6);
    const range3 = NumberRange.fromInclusive(6).toInclusive(8);

    expect(range1.overlaps(range2)).toBeTrue();
    expect(range1.overlaps(range3)).toBeFalse();
  });

  it('should correctly handle inclusive left and exclusive right bounds', () => {
    const range = NumberRange.fromInclusive(1).toExclusive(5);
    expect(range.contains(1)).toBeTrue();
    expect(range.contains(5)).toBeFalse();
  });

  it('should correctly handle exclusive left and inclusive right bounds', () => {
    const range = NumberRange.fromExclusive(1).toInclusive(5);
    expect(range.contains(1)).toBeFalse();
    expect(range.contains(5)).toBeTrue();
  });

  it('should correctly handle exclusive bounds', () => {
    const range = NumberRange.fromExclusive(1).toExclusive(5);
    expect(range.contains(1)).toBeFalse();
    expect(range.contains(5)).toBeFalse();
    expect(range.contains(3)).toBeTrue();
  });

  it('should correctly handle inclusive bounds', () => {
    const range = NumberRange.fromInclusive(1).toInclusive(5);
    expect(range.contains(1)).toBeTrue();
    expect(range.contains(5)).toBeTrue();
    expect(range.contains(3)).toBeTrue();
  });
});
