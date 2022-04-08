import { CodePrinter } from './codeprinter';
import { Expression } from './expression';

describe('CodePrinter', () => {
  it('declares variables', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: 'bar' }))
    );

    expect(foo.bar).toBe('bar');
    expect(codePrinter.size()).toBe(1);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar: 'bar' };`]);
  });

  it('tracks comments', () => {
    const codePrinter = new CodePrinter();

    codePrinter.comment('hello world');

    expect(codePrinter.size()).toBe(1);
    expect(codePrinter.flush()).toStrictEqual(['// hello world']);
  });

  it('tracks setting strings', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: 'bar' }))
    );

    foo.bar = 'baz';

    expect(foo.bar).toBe('baz');
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar: 'bar' };`, `foo.bar = 'baz';`]);
  });

  it('tracks setting numbers', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: 21 }))
    );

    foo.bar = 42;

    expect(foo.bar).toBe(42);
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar: 21 };`, `foo.bar = 42;`]);
  });

  it('tracks setting booleans', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: false }))
    );

    foo.bar = true;

    expect(foo.bar).toBeTrue();
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar: false };`, `foo.bar = true;`]);
  });

  it('tracks setting arrays', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: ['bar', 2, true] }))
    );

    foo.bar = ['baz', 5, false];

    expect(foo.bar).toStrictEqual(['baz', 5, false]);
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo = { bar: ['bar', 2, true] };`,
      `foo.bar = ['baz', 5, false];`,
    ]);
  });

  it('tracks setting objects', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: { baz: true } }))
    );

    foo.bar = { baz: false };

    expect(foo.bar).toStrictEqual({ baz: false });
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar: { baz: true } };`, `foo.bar = { baz: false };`]);
  });

  it('tracks setting multiple variables', () => {
    const codePrinter = new CodePrinter();
    const foo1 = codePrinter.watch(
      'foo1',
      Expression.of(() => ({ bar: 'bar' }))
    );
    const foo2 = codePrinter.watch(
      'foo2',
      Expression.of(() => ({ bar: 'bar' }))
    );

    foo1.bar = 'baz';
    foo2.bar = 'bam';

    expect(foo1.bar).toBe('baz');
    expect(foo2.bar).toBe('bam');
    expect(codePrinter.size()).toBe(4);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo1 = { bar: 'bar' };`,
      `const foo2 = { bar: 'bar' };`,
      `foo1.bar = 'baz';`,
      `foo2.bar = 'bam';`,
    ]);
  });

  it('tracks setting a variable multiple times', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar: 'bar' }))
    );

    foo.bar = 'baz';
    foo.bar = 'bam';
    foo.bar = 'bar';

    expect(foo.bar).toBe('bar');
    expect(codePrinter.size()).toBe(4);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo = { bar: 'bar' };`,
      `foo.bar = 'baz';`,
      `foo.bar = 'bam';`,
      `foo.bar = 'bar';`,
    ]);
  });

  it('tracks function calls without args', () => {
    const codePrinter = new CodePrinter();
    const bar = jest.fn().mockReturnValue(42);
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar }))
    );

    const result = foo.bar();

    expect(bar).toHaveBeenCalledOnce();
    expect(result).toBe(42);
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual(['const foo = { bar };', 'foo.bar();']);
  });

  it('tracks function calls with args', () => {
    const codePrinter = new CodePrinter();
    const bar = jest.fn().mockReturnValue(42);
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar }))
    );

    const result = foo.bar('hello', 67, true);

    expect(bar).toHaveBeenCalledOnce();
    expect(result).toBe(42);
    expect(codePrinter.size()).toBe(2);
    expect(codePrinter.flush()).toStrictEqual([`const foo = { bar };`, `foo.bar('hello', 67, true);`]);
  });

  it('tracks multiple function calls', () => {
    const codePrinter = new CodePrinter();
    const bar = jest.fn();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar }))
    );

    foo.bar('how', 'are', 'you', false);
    foo.bar('i', 'am', 'fine', true);

    expect(bar).toHaveBeenCalledTimes(2);
    expect(codePrinter.size()).toBe(3);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo = { bar };`,
      `foo.bar('how', 'are', 'you', false);`,
      `foo.bar('i', 'am', 'fine', true);`,
    ]);
  });

  it('tracks function calls and setters', () => {
    const codePrinter = new CodePrinter();
    const bar = jest.fn();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar, baz: 'baz' }))
    );

    foo.bar({ ok: true });
    foo.baz = 'bam';
    foo.bar({ ok: false });

    expect(bar).toHaveBeenCalledTimes(2);
    expect(foo.baz).toBe('bam');
    expect(codePrinter.size()).toBe(4);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo = { bar, baz: 'baz' };`,
      `foo.bar({ ok: true });`,
      `foo.baz = 'bam';`,
      `foo.bar({ ok: false });`,
    ]);
  });

  it('tracks the values from watched getters', () => {
    const codePrinter = new CodePrinter();
    const container = codePrinter.watch(
      'container',
      Expression.of(() => ({ value: 'hello' }))
    );
    const call = jest.fn();
    const caller = codePrinter.watch(
      'caller',
      Expression.of(() => ({ call }))
    );

    caller.call(container.value);

    expect(call).toHaveBeenCalledOnce();
    expect(codePrinter.size()).toBe(3);
    expect(codePrinter.flush()).toStrictEqual([
      `const container = { value: 'hello' };`,
      `const caller = { call };`,
      `caller.call(container.value);`,
    ]);
  });

  it('tracks the variables themselves of watched getters', () => {
    const codePrinter = new CodePrinter();
    const container = codePrinter.watch(
      'container',
      Expression.of(() => ({ value: 'hello' }))
    );
    const call = jest.fn();
    const caller = codePrinter.watch(
      'caller',
      Expression.of(() => ({ call }))
    );

    caller.call(container);

    expect(call).toHaveBeenCalledOnce();
    expect(codePrinter.size()).toBe(3);
    expect(codePrinter.flush()).toStrictEqual([
      `const container = { value: 'hello' };`,
      `const caller = { call };`,
      `caller.call(container);`,
    ]);
  });

  it('tracks nested variable usage', () => {
    const codePrinter = new CodePrinter();
    const container = codePrinter.watch(
      'container',
      Expression.of(() => ({ value: 'hello' }))
    );
    const call = jest.fn();
    const caller = codePrinter.watch(
      'caller',
      Expression.of(() => ({ call }))
    );

    caller.call({ nested: container.value });

    expect(call).toHaveBeenCalledOnce();
    expect(codePrinter.size()).toBe(3);
    expect(codePrinter.flush()).toStrictEqual([
      `const container = { value: 'hello' };`,
      `const caller = { call };`,
      `caller.call({ nested: container.value });`,
    ]);
  });

  it('tracks variables that use function args that reference themselves', () => {
    const codePrinter = new CodePrinter();
    const bar = jest.fn();
    const foo = codePrinter.watch(
      'foo',
      Expression.of(() => ({ bar, baz: 'baz' }))
    );

    foo.baz = 'boom';
    foo.bar(foo.baz);

    expect(foo.baz).toBe('boom');
    expect(bar).toHaveBeenCalledOnce();
    expect(codePrinter.size()).toBe(3);
    expect(codePrinter.flush()).toStrictEqual([
      `const foo = { bar, baz: 'baz' };`,
      `foo.baz = 'boom';`,
      `foo.bar(foo.baz);`,
    ]);
  });
});
