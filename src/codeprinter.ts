import * as babel from 'prettier/parser-babel';
import * as prettier from 'prettier/standalone';

/**
 * CodeTracker is a crude interface for manually keeping track of parallel code strings.
 */
export interface CodeTracker {
  literal(literal: string): void;
  comment(comment: string): void;
  newline(): void;
}

/** CodePrinter is a code tracker that allows the content to be printed at any point. */
export class CodePrinter implements CodeTracker {
  static noop(): CodeTracker {
    return new NoopCodePrinter();
  }

  private lines = new Array<string>();

  /** Tracks a literal string. Callers must track valid JavaScript. */
  literal(literal: string): void {
    this.record(literal);
  }

  /** Tracks a newline. */
  newline(): void {
    this.record('');
  }

  /** Tracks a '//' style comment. */
  comment(comment: string): void {
    const trimmed = comment.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      throw new Error('unexpected comment symbol');
    }
    this.record(`// ${comment}`);
  }

  /** Prints and formats the code using prettier. It will throw an error for invalid JavaScript code. */
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

/**
 * NoopCodePrinter is a noop CodeTracker.
 *
 * Its intent is to avoid needlessly storing code trackings if the caller does not care about it.
 */
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
