import { Expression } from './expression';

describe('Expression', () => {
  it('storess the value returned by the getter', () => {
    const foo = Symbol('foo');
    const expression = Expression.of(() => foo);
    expect(expression.value).toBe(foo);
  });

  it('computes string literals', () => {
    const expression = Expression.of(() => 'hello');
    expect(expression.toString()).toBe(`'hello'`);
  });

  it('computes number literals', () => {
    const expression = Expression.of(() => 42);
    expect(expression.toString()).toBe('42');
  });

  it('computes boolean literals', () => {
    const expression = Expression.of(() => true);
    expect(expression.toString()).toBe('true');
  });

  it('computes symbol literals', () => {
    const expression = Expression.of(() => Symbol('hey'));
    expect(expression.toString()).toBe(`Symbol('hey')`);
  });

  it('computes array literals', () => {
    const expression = Expression.of(() => ['foo', 'bar']);
    expect(expression.toString()).toBe(`['foo', 'bar']`);
  });

  it('computes mixed array literals', () => {
    const expression = Expression.of(() => ['foo', 42, false]);
    expect(expression.toString()).toBe(`['foo', 42, false]`);
  });

  it('computes non-empty object literals', () => {
    const expression = Expression.of(() => ({ foo: 'foo' }));
    expect(expression.toString()).toBe(`{ foo: 'foo' }`);
  });

  it('computes nested object literals', () => {
    const expression = Expression.of(() => ({ foo: { bar: 42 } }));
    expect(expression.toString()).toBe(`{ foo: { bar: 42 } }`);
  });

  it('computes complex object literals', () => {
    const expression = Expression.of(() => ({ foo: ['foo', true, [1]], bar: { baz: Symbol('baz') } }));
    expect(expression.toString()).toBe(`{ foo: ['foo', true, [1]], bar: { baz: Symbol('baz') } }`);
  });

  it('maintains variable names', () => {
    const foo = {};

    const expression = Expression.of(() => foo);

    expect(expression.value).toBe(foo);
    expect(expression.toString()).toBe('foo');
  });

  it('maintains variable names within an object', () => {
    const foo = {};

    const expression = Expression.of(() => ({ foo }));

    expect(expression.value.foo).toBe(foo);
    expect(expression.toString()).toBe('{ foo }');
  });

  it('computes constructor expressions', () => {
    class Foo {}
    const expression = Expression.of(() => new Foo());
    expect(expression.value).toBeInstanceOf(Foo);
  });

  it('removes new lines in expressions', () => {
    const expression = Expression.of(() => {
      return {
        foo: 'foo',
        bar: 'bar',
      };
    });
    expect(expression.toString()).toBe(`{ foo: 'foo', bar: 'bar' }`);
  });

  it('allows arrow functions with implicit returns', () => {
    expect(() => Expression.of(() => 'hello')).not.toThrow();
  });

  it('allows arrow functions with explicit returns', () => {
    expect(() =>
      Expression.of(() => {
        return 'hello';
      })
    ).not.toThrow();
  });

  it('disallows using non-arrow functions', () => {
    expect(() =>
      Expression.of(function foo() {
        return 'foo';
      })
    ).toThrow();
  });

  it('disallows using arrow functions with more then one expression', () => {
    expect(() =>
      Expression.of(() => {
        const foo = {};
        return foo;
      })
    ).toThrow();
  });

  it('disallows arrow functions without returns', () => {
    expect(() =>
      Expression.of(() => {
        // noop
      })
    ).toThrow();
  });

  it('disallows functions with spread parameters', () => {
    expect(() => Expression.of((...args: any[]) => args)).toThrow();
  });
});
