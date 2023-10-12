import * as util from '@/util';

describe('assertNotNull', () => {
  it('throws when the value is null', () => {
    const value = (): string | null => null;
    expect(() => util.assertNotNull(value())).toThrow();
  });

  it('does not throw when value is undefined', () => {
    const value = (): undefined | null => undefined;
    expect(() => util.assertNotNull(value())).not.toThrow();
  });

  it('does not throw when value is truthy', () => {
    const value = (): boolean | null => true;
    expect(() => util.assertNotNull(value())).not.toThrow();
  });

  it('does not throw for falsy values', () => {
    const value = (): boolean | null => false;
    expect(() => util.assertNotNull(value())).not.toThrow();
  });
});
