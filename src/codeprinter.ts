import * as babel from 'prettier/parser-babel';
import * as prettier from 'prettier/standalone';
import { CodeTracker } from './types';

export class CodePrinter implements CodeTracker {
  static noop(): CodeTracker {
    return new NoopCodePrinter();
  }

  private lines = new Array<string>();

  literal(literal: string): void {
    this.record(literal);
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
  literal(): void {
    // noop
  }

  comment() {
    // noop
  }

  newline() {
    // noop
  }
}
