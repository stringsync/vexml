/**
 * Stem represents the notated stem direction.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/stem-value/
 */
export type Stem = 'up' | 'down' | 'double' | 'none';

/**
 * NoteType represents the graphic note type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/note-type-value/
 */
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

/**
 * NoteDurationDenominator corresponds to the fraction duration of a note. The values are vexflow-specific.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L16.
 */
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
  | '1'
  | '1/2'
  | '1/2'
  | '';

/**
 * TimeSignature is a wrapper around the <time> element's <beats> and <beat-type> elements.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/
 */
export type TimeSignature = {
  numerator: string;
  denominator: string;
};

/**
 * StaffLayout describes how a staff is positioned.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-layout/
 */
export type StaffLayout = {
  number: number;
  staffDistance: number | null;
};

/**
 * SystemLayout is a group of staves that are read and played simultaneously.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/system-layout/
 */
export type SystemLayout = {
  leftMargin: number | null;
  rightMargin: number | null;
  topSystemDistance: number | null;
  systemDistance: number | null;
};
