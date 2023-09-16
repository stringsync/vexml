import { Value, Enum } from '@/util';

describe(Value, () => {
  describe('of', () => {
    it('creates a Value', () => {
      const value = Value.of('foo');
      expect(value).toBeInstanceOf(Value);
    });
  });

  describe('withDefault', () => {
    it('sets the default of the Value', () => {
      const value = Value.of(null).withDefault('foo');
      expect(value.str()).toBe('foo');
    });

    it('allows a default different than the type being casted', () => {
      const value = Value.of(null).withDefault(42);
      expect(value.str()).toBe(42);
    });
  });

  describe('str', () => {
    it('parses a string', () => {
      const value = Value.of('foo');
      expect(value.str()).toBe('foo');
    });
  });

  describe('bool', () => {
    it('parses a true boolean', () => {
      const value = Value.of('true');
      expect(value.bool()).toBeTrue();
    });

    it('parses a false boolean', () => {
      const value = Value.of('false');
      expect(value.bool()).toBeFalse();
    });

    it('returns the default when not true or false', () => {
      const value = Value.of('foo');
      expect(value.bool()).toBeNull();
    });
  });

  describe('int', () => {
    it('parses an integer', () => {
      const value = Value.of('42');
      expect(value.int()).toBe(42);
    });

    it('returns the default when null', () => {
      const value = Value.of(null).withDefault(42);
      expect(value.int()).toBe(42);
    });

    it('returns the default when NaN', () => {
      const value = Value.of('foo').withDefault(42);
      expect(value.int()).toBe(42);
    });
  });

  describe('float', () => {
    it('parses a float', () => {
      const value = Value.of('42.2');
      expect(value.float()).toBe(42.2);
    });

    it('parses an integer', () => {
      const value = Value.of('42');
      expect(value.float()).toBe(42);
    });

    it('returns the default when null', () => {
      const value = Value.of(null).withDefault(42.2);
      expect(value.float()).toBe(42.2);
    });

    it('returns the default when NaN', () => {
      const value = Value.of('foo').withDefault(42.2);
      expect(value.float()).toBe(42.2);
    });
  });

  describe('enum', () => {
    const METASYNTATIC_VARIABLES = new Enum(['foo', 'bar', 'baz']);

    it('parses an enum', () => {
      const value = Value.of('foo');
      expect(value.enum(METASYNTATIC_VARIABLES)).toBe('foo');
    });

    it('returns the default when null', () => {
      const value = Value.of(null);
      expect(value.enum(METASYNTATIC_VARIABLES)).toBeNull();
    });

    it('returns the default when not valid enum member', () => {
      const value = Value.of('hello world');
      expect(value.enum(METASYNTATIC_VARIABLES)).toBeNull();
    });
  });
});
