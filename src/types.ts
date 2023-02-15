export interface CodeTracker {
  literal(literal: string): void;
  comment(comment: string): void;
  newline(): void;
}
