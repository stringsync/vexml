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
