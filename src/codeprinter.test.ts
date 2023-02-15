import { CodeTracker } from './types';
import { CodePrinter } from './codeprinter';

describe('CodePrinter', () => {
  describe('constructor', () => {
    let codePrinter: CodePrinter;

    beforeEach(() => {
      codePrinter = new CodePrinter();
    });

    describe('literal', () => {
      it('records whatever string is passed in', () => {
        codePrinter.literal('let foo = undefined;');
        const result = codePrinter.print();
        expect(result).toBe('let foo = undefined;\n');
      });
    });

    describe('newline', () => {
      it('records a newline', () => {
        codePrinter.literal('let foo;');
        codePrinter.newline();
        codePrinter.literal('let bar;');

        const result = codePrinter.print();

        expect(result).toBe(`let foo;\n\nlet bar;\n`);
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
        codePrinter.literal(`let foo;`);
        const result = codePrinter.print();
        expect(result).toBe(`let foo;\n`);
      });
    });
  });

  describe('noop', () => {
    let codePrinter: CodeTracker;

    beforeEach(() => {
      codePrinter = CodePrinter.noop();
    });

    describe('literal', () => {
      it('runs without crashing', () => {
        expect(() => codePrinter.literal('foo')).not.toThrow();
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
