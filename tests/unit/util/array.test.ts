import { first, forEachTriple, last } from '@/util';

describe('first', () => {
  it('returns the first element of an array', () => {
    const firstElement = Symbol();
    const arr = [firstElement, Symbol()];
    expect(first(arr)).toBe(firstElement);
  });

  it('returns null when the first element does not exist', () => {
    expect(first([])).toBeNull();
  });
});

describe('last', () => {
  it('returns the last element of an array', () => {
    const lastElement = Symbol();
    const arr = [Symbol(), lastElement];
    expect(last(arr)).toBe(lastElement);
  });

  it('returns null when the last element does not exist', () => {
    expect(last([])).toBeNull();
  });
});

describe('forEachTriple', () => {
  it('iterates over each [previous, current, next] triple providing an index', () => {
    const callback = jest.fn();

    forEachTriple([1, 2, 3], callback);

    expect(callback.mock.calls).toStrictEqual([
      [[null, 1, 2], { index: 0, isFirst: true, isLast: false }],
      [[1, 2, 3], { index: 1, isFirst: false, isLast: false }],
      [[2, 3, null], { index: 2, isFirst: false, isLast: true }],
    ]);
  });

  it('does not iterate over anything when the array is empty', () => {
    const callback = jest.fn();
    forEachTriple([], callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
