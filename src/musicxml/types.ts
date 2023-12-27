import { Measure } from './measure';
import { Part } from './part';

/**
 * StaveLayout describes how a stave is positioned.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-layout/
 */
export type StaveLayout = {
  staveNumber: number;
  staveDistance: number | null;
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

/** A part and measure. */
export type PartMeasure = {
  part: Part;
  measure: Measure;
};
