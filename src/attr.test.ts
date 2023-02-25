import { Attr } from './attr';

describe(Attr, () => {
  describe('str', () => {
    it('parses a value into a string', () => {
      const attr = Attr.of('foo');
      expect(attr.str()).toBe('foo');
    });

    it('defaults when the string is null', () => {
      const attr = Attr.of(null).withDefault('foo');
      expect(attr.str()).toBe('foo');
    });

    it('does not default empty strings', () => {
      const attr = Attr.of('');
      expect(attr.str()).toBe('');
    });
  });

  describe('bool', () => {
    it('parses true string', () => {
      const attr = Attr.of('true');
      expect(attr.bool()).toBeTrue();
    });

    it('parses false string', () => {
      const attr = Attr.of('false');
      expect(attr.bool()).toBeFalse();
    });

    it('defaults non-boolean strings', () => {
      const attr = Attr.of('0');
      expect(attr.bool()).toBeNull();
    });

    it('defaults null', () => {
      const attr = Attr.of(null).withDefault('foo');
      expect(attr.bool()).toBe('foo');
    });
  });

  describe('int', () => {
    it('parses a value into an integer', () => {
      const attr = Attr.of('42');
      expect(attr.int()).toBe(42);
    });

    it('truncates decimals', () => {
      const attr = Attr.of('42.99999');
      expect(attr.int()).toBe(42);
    });

    it('defaults NaNs', () => {
      const attr = Attr.of('NaN');
      expect(attr.int()).toBeNull();
    });

    it('defaults null', () => {
      const attr = Attr.of(null).withDefault(42);
      expect(attr.int()).toBe(42);
    });
  });

  describe('float', () => {
    it('parses a value into a float', () => {
      const attr = Attr.of('42.2');
      expect(attr.float()).toBe(42.2);
    });

    it('parses integer strings', () => {
      const attr = Attr.of('42');
      expect(attr.float()).toBe(42);
    });

    it('defaults NaNs', () => {
      const attr = Attr.of('NaN');
      expect(attr.float()).toBeNull();
    });

    it('defaults null', () => {
      const attr = Attr.of(null).withDefault(42.2);
      expect(attr.float()).toBe(42.2);
    });
  });

  describe('enum', () => {
    type Choice = 'foo' | 'bar' | 'baz';

    const Choices: Choice[] = ['foo', 'bar', 'baz'];

    it('parses a value into an enum', () => {
      const attr = Attr.of('bar');
      expect(attr.enum(Choices)).toBe('bar');
    });

    it('defaults when the value is not part of the enum', () => {
      const attr = Attr.of('bam');
      expect(attr.enum(Choices)).toBeNull();
    });

    it('defaults null', () => {
      const attr = Attr.of(null).withDefault('foo' as const);
      expect(attr.enum(Choices)).toBe('foo');
    });
  });
});
