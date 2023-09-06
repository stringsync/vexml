import { Enum } from '@/enums';
import { Value } from '@/value';

describe(Value, () => {
  describe('withDefault', () => {
    it('returns a new instance', () => {
      const value = Value.of('foo');
      expect(value.withDefault('bar')).not.toBe(value);
    });

    it('sets a default on the new instance', () => {
      const value = Value.of(null);
      expect(value.withDefault('bar').str()).toBe('bar');
    });

    it('leaves the original instance intact', () => {
      const value = Value.of(null);
      value.withDefault('bar');
      expect(value.str()).toBeNull();
    });
  });

  describe('str', () => {
    it('parses a value into a string', () => {
      const value = Value.of('foo');
      expect(value.str()).toBe('foo');
    });

    it('defaults when the string is null', () => {
      const value = Value.of(null).withDefault('foo');
      expect(value.str()).toBe('foo');
    });

    it('does not default empty strings', () => {
      const value = Value.of('');
      expect(value.str()).toBe('');
    });
  });

  describe('bool', () => {
    it('parses true string', () => {
      const value = Value.of('true');
      expect(value.bool()).toBeTrue();
    });

    it('parses false string', () => {
      const value = Value.of('false');
      expect(value.bool()).toBeFalse();
    });

    it('defaults non-boolean strings', () => {
      const value = Value.of('0');
      expect(value.bool()).toBeNull();
    });

    it('defaults null', () => {
      const value = Value.of(null).withDefault('foo');
      expect(value.bool()).toBe('foo');
    });
  });

  describe('int', () => {
    it('parses a value into an integer', () => {
      const value = Value.of('42');
      expect(value.int()).toBe(42);
    });

    it('truncates decimals', () => {
      const value = Value.of('42.99999');
      expect(value.int()).toBe(42);
    });

    it('defaults NaNs', () => {
      const value = Value.of('NaN');
      expect(value.int()).toBeNull();
    });

    it('defaults null', () => {
      const value = Value.of(null).withDefault(42);
      expect(value.int()).toBe(42);
    });
  });

  describe('float', () => {
    it('parses a value into a float', () => {
      const value = Value.of('42.2');
      expect(value.float()).toBe(42.2);
    });

    it('parses integer strings', () => {
      const value = Value.of('42');
      expect(value.float()).toBe(42);
    });

    it('defaults NaNs', () => {
      const value = Value.of('NaN');
      expect(value.float()).toBeNull();
    });

    it('defaults null', () => {
      const value = Value.of(null).withDefault(42.2);
      expect(value.float()).toBe(42.2);
    });
  });

  describe('enum', () => {
    const Choices = new Enum(['foo', 'bar', 'baz'] as const);

    it('parses a value into an enum', () => {
      const value = Value.of('bar');
      expect(value.enum(Choices)).toBe('bar');
    });

    it('defaults when the value is not part of the enum', () => {
      const value = Value.of('bam');
      expect(value.enum(Choices)).toBeNull();
    });

    it('defaults null', () => {
      const value = Value.of(null).withDefault('foo' as const);
      expect(value.enum(Choices)).toBe('foo');
    });
  });
});
