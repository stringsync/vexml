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
    this.record(`${literal};`);
    return expression.value;
  }

  newline(): void {
    this.record('');
  }

  comment(comment: string): void {
    if (comment.startsWith('//') || comment.startsWith('/*')) {
      throw new Error('do not add comment symbols');
    }
    this.record(`// ${comment}`);
  }

  print(): string {
    return this.lines.join('\n');
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
