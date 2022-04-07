import { CodePrinter } from './codeprinter';

describe('CodePrinter', () => {
  it('tracks setting strings', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch({ bar: 'bar' }, 'foo');

    foo.bar = 'baz';

    expect(foo.bar).toBe('baz');
    expect(codePrinter.flush()).toStrictEqual([`foo.bar = 'baz'`]);
  });

  it('tracks setting numbers', () => {
    const codePrinter = new CodePrinter();
    const foo = codePrinter.watch({ bar: 21 }, 'foo');

    foo.bar = 42;

    expect(foo.bar).toBe(42);
    expect(codePrinter.flush()).toStrictEqual([`foo.bar = 42`]);
  });
});
