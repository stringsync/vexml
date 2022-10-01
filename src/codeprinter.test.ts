import { CodePrinter } from './codeprinter';
import { CodeTracker } from './types';

describe('CodePrinter', () => {
  describe('constructor', () => {
    let codePrinter: CodePrinter;

    beforeEach(() => {
      codePrinter = new CodePrinter();
    });

    describe('let', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.let('foo', () => value);
        expect(result).toBe(value);
      });

      it('declares a defined variable', () => {
        codePrinter.let('foo', () => Symbol());
        const result = codePrinter.print();
        expect(result).toBe('let foo = Symbol();\n');
      });

      it('declares an undefined variable', () => {
        codePrinter.let('foo', () => undefined);
        const result = codePrinter.print();
        expect(result).toBe('let foo;\n');
      });

      it('declares multiple variables', () => {
        codePrinter.let('foo', () => 'foo');
        codePrinter.let('bar', () => 'bar');

        const result = codePrinter.print();

        expect(result).toBe(`let foo = 'foo';\nlet bar = 'bar';\n`);
      });
    });

    describe('const', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.const('foo', () => value);
        expect(result).toBe(value);
      });

      it('declares a defined variable', () => {
        codePrinter.const('foo', () => Symbol());
        const result = codePrinter.print();
        expect(result).toBe('const foo = Symbol();\n');
      });

      it('declares multiple variables', () => {
        codePrinter.const('foo', () => 'foo');
        codePrinter.const('bar', () => 'bar');

        const result = codePrinter.print();

        expect(result).toBe(`const foo = 'foo';\nconst bar = 'bar';\n`);
      });
    });

    describe('literal', () => {
      it('records whatever string is passed in', () => {
        codePrinter.literal('let foo = undefined;');
        const result = codePrinter.print();
        expect(result).toBe('let foo = undefined;\n');
      });
    });

    describe('expression', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.expression(() => value);
        expect(result).toBe(value);
      });

      it('records complex expressions', () => {
        codePrinter.expression(() => ['foo', 1, true]);
        const result = codePrinter.print();
        expect(result).toBe(`['foo', 1, true];\n`);
      });
    });

    describe('newline', () => {
      it('records a newline', () => {
        codePrinter.let('foo', () => 'foo');
        codePrinter.newline();
        codePrinter.const('bar', () => 'bar');

        const result = codePrinter.print();

        expect(result).toBe(`let foo = 'foo';\n\nconst bar = 'bar';\n`);
      });
    });

    describe('comment', () => {
      it('records a comment', () => {
        codePrinter.comment('foo');
        const result = codePrinter.print();
        expect(result).toBe('// foo\n');
      });

      it('throws if the comment starts with //', () => {
        expect(() => codePrinter.comment('// foo')).toThrow();
      });

      it('throws if the comment starts with /*', () => {
        expect(() => codePrinter.comment('/* foo')).toThrow();
      });
    });

    describe('print', () => {
      it('prints whatever is recorded', () => {
        codePrinter.let('foo', () => 'foo');
        const result = codePrinter.print();
        expect(result).toBe(`let foo = 'foo';\n`);
      });
    });
  });

  describe('noop', () => {
    let codePrinter: CodeTracker;

    beforeEach(() => {
      codePrinter = CodePrinter.noop();
    });

    describe('let', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.let('foo', () => value);
        expect(result).toBe(value);
      });
    });

    describe('const', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.const('foo', () => value);
        expect(result).toBe(value);
      });
    });

    describe('literal', () => {
      it('runs without crashing', () => {
        expect(() => codePrinter.literal('foo')).not.toThrow();
      });
    });

    describe('expression', () => {
      it('returns the getter', () => {
        const value = Symbol();
        const result = codePrinter.expression(() => value);
        expect(result).toBe(value);
      });
    });

    describe('comment', () => {
      it('runs without crashing', () => {
        expect(() => codePrinter.literal('foo')).not.toThrow();
      });
    });

    describe('newline', () => {
      it('runs without crashing', () => {
        expect(() => codePrinter.newline()).not.toThrow();
      });
    });
  });
});
