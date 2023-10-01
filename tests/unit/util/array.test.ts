import { first, last } from '@/util';

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
