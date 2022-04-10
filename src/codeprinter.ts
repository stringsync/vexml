import * as babel from 'prettier/parser-babel';
import * as prettier from 'prettier/standalone';
import { Expression } from './expression';
import { CodeTracker, Getter } from './types';

export class CodePrinter implements CodeTracker {
  static noop(): CodeTracker {
    return new NoopCodePrinter();
  }

  private lines = new Array<string>();

  let<T>(variableName: string, getter: Getter<T>): T {
    const expression = Expression.of(getter);
    const literal =
      typeof expression.value === 'undefined'
        ? `let ${variableName};`
        : `let ${variableName} = ${expression.toString()};`;
    this.record(literal);
    return expression.value;
  }

  const<T>(variableName: string, getter: Getter<T>): T {
    const expression = Expression.of(getter);
    const literal = `const ${variableName} = ${expression.toString()};`;
    this.record(literal);
    return expression.value;
  }

  literal(literal: string): void {
    this.record(literal);
  }

  expression<T>(getter: Getter<T>): T {
    const expression = Expression.of(getter);
    const literal = expression.toString();
    this.record(literal);
    return expression.value;
  }

  newline(): void {
    this.record('');
  }

  comment(comment: string): void {
    const trimmed = comment.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      throw new Error('unexpected comment symbol');
    }
    this.record(`// ${comment}`);
  }

  print(): string {
    const src = this.lines.join('\n');
    return prettier.format(src, {
      parser: 'babel',
      semi: true,
      singleQuote: true,
      plugins: [babel],
    });
  }

  private record(literal: string) {
    this.lines.push(literal);
  }
}

class NoopCodePrinter implements CodeTracker {
  let<T>(variableName: string, getter: Getter<T>): T {
    return getter();
  }

  const<T>(variableName: string, getter: Getter<T>): T {
    return getter();
  }

  literal(): void {
    // noop
  }

  expression<T>(getter: Getter<T>): T {
    return getter();
  }

  comment() {
    // noop
  }

  newline() {
    // noop
  }
}
