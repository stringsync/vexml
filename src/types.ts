export interface CodeTracker {
  literal(literal: string): void;
  comment(comment: string): void;
  newline(): void;
}

export type Stem = 'up' | 'down' | 'double' | 'none';

export type NoteType =
  | '1024th'
  | '512th'
  | '256th'
  | '128th'
  | '64th'
  | '32nd'
  | '16th'
  | 'eighth'
  | 'quarter'
  | 'half'
  | 'whole'
  | 'breve'
  | 'long'
  | 'maxima';

export type NoteDurationDenominator =
  | '1024'
  | '512'
  | '256'
  | '128'
  | '64'
  | '32'
  | '16'
  | '8'
  | '4'
  | '2'
  | 'w'
  | '1/2'
  | '1/2'
  | '';
