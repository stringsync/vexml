type Values<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

export type EnumValues<T extends Enum<any>> = T extends Enum<infer U> ? Values<U> : never;

/** An enumeration of string values. */
export class Enum<T extends readonly string[]> {
  constructor(public readonly values: T) {}

  /** Type predicate that returns whether or not the value is one of the choices. */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  includes(value: any): value is Values<T> {
    return this.values.includes(value);
  }
}

/**
 * Stem represents the notated stem direction.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/stem-value/
 */
export type Stem = EnumValues<typeof STEMS>;
export const STEMS = new Enum(['up', 'down', 'double', 'none'] as const);

/**
 * NoteType represents the graphic note type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/note-type-value/
 */
export type NoteType = EnumValues<typeof NOTE_TYPES>;
export const NOTE_TYPES = new Enum([
  '1024th',
  '512th',
  '256th',
  '128th',
  '64th',
  '32nd',
  '16th',
  'eighth',
  'quarter',
  'half',
  'whole',
  'breve',
  'long',
  'maxima',
] as const);

/**
 * NoteDurationDenominator corresponds to the fraction duration of a note. The values are vexflow-specific.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L16.
 */
export type NoteDurationDenominator = EnumValues<typeof NOTE_DURATION_DENOMINATORS>;
export const NOTE_DURATION_DENOMINATORS = new Enum([
  '1024',
  '512',
  '256',
  '128',
  '64',
  '32',
  '16',
  '8',
  '4',
  '2',
  '1',
  '1/2',
  '1/2',
  '',
] as const);

/**
 * Notated accidentals supported by MusicXML.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/accidental-value/
 */
export type AccidentalType = EnumValues<typeof ACCIDENTAL_TYPES>;
export const ACCIDENTAL_TYPES = new Enum([
  'sharp',
  'natural',
  'flat',
  'double-sharp',
  'sharp-sharp',
  'flat-flat',
  'natural-sharp',
  'natural-flat',
  'quarter-flat',
  'quarter-sharp',
  'three-quarters-flat',
  'three-quarters-sharp',
  'sharp-down',
  'sharp-up',
  'natural-down',
  'natural-up',
  'flat-down',
  'flat-up',
  'double-sharp-down',
  'double-sharp-up',
  'flat-flat-down',
  'flat-flat-up',
  'arrow-down',
  'arrow-up',
  'triple-sharp',
  'triple-flat',
  'slash-quarter-sharp',
  'slash-sharp',
  'slash-flat',
  'double-slash-flat',
  'flat-1',
  'flat-2',
  'flat-3',
  'flat-4',
  'sori',
  'koron',
  'other',
] as const);

/**
 * The accidental code from VexFlow. The list only contains typical accidentals from Western music and is currently not
 * exhaustive.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L169
 */
export type AccidentalCode = EnumValues<typeof ACCIDENTAL_CODES>;
export const ACCIDENTAL_CODES = new Enum(['#', '##', 'b', 'bb', 'n'] as const);

/**
 * Notehead shapes other than the open and closed ovals associated with note durations.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/notehead-value/
 */
export type Notehead = EnumValues<typeof NOTEHEADS>;
export const NOTEHEADS = new Enum([
  'arrow down',
  'arrow up',
  'back slashed',
  'circle dot',
  'circle-x',
  'circled',
  'cluster',
  'cross',
  'diamond',
  'do',
  'fa',
  'fa up',
  'inverted triangle',
  'la',
  'left triangle',
  'mi',
  'none',
  'normal',
  're',
  'rectangle',
  'slash',
  'slashed',
  'so',
  'square',
  'ti',
  'triangle',
  'x',
  'other',
] as const);

/**
 * The suffix for a fully qualified key.
 *
 * See https://github.com/0xfe/vexflow/blob/974fe1aaf5bb6270577053200a59c87b32d99d31/src/tables.ts#L817
 */
export type NoteheadSuffix = EnumValues<typeof NOTEHEAD_SUFFIXES>;
export const NOTEHEAD_SUFFIXES = new Enum([
  '',
  'D0',
  'D1',
  'D2',
  'D3',
  'T0',
  'T1',
  'T2',
  'T3',
  'X0',
  'X1',
  'X2',
  'X3',
  'S1',
  'S2',
  'R1',
  'R2',
  'DO',
  'RE',
  'MI',
  'FA',
  'FAUP',
  'SO',
  'LA',
  'TI',
  'D',
  'H',
  'N',
  'G',
  'M',
  'X',
  'CX',
  'CI',
  'S',
  'SQ',
  'TU',
  'TD',
  'SF',
  'SB',
] as const);

/**
 * The bar style of a measure.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/bar-style/
 */
export type BarStyle = EnumValues<typeof BAR_STYLES>;
export const BAR_STYLES = new Enum([
  'dashed',
  'dotted',
  'heavy',
  'heavy-heavy',
  'heavy-light',
  'light-heavy',
  'light-light',
  'none',
  'regular',
  'short',
  'tick',
] as const);

export type VerticalDirection = EnumValues<typeof VERTICAL_DIRECTIONS>;
export const VERTICAL_DIRECTIONS = new Enum(['up', 'down'] as const);

/**
 * The direction of a repeat.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/backward-forward/
 */
export type RepeatDirection = EnumValues<typeof REPEAT_DIRECTIONS>;
export const REPEAT_DIRECTIONS = new Enum(['backward', 'forward'] as const);

/**
 * The location of a barline.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/right-left-middle/
 */
export type BarlineLocation = EnumValues<typeof BARLINE_LOCATIONS>;
export const BARLINE_LOCATIONS = new Enum(['right', 'left', 'middle'] as const);

/**
 * The ending type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/start-stop-discontinue/
 */
export type EndingType = EnumValues<typeof ENDING_TYPES>;
export const ENDING_TYPES = new Enum(['start', 'stop', 'discontinue'] as const);

/**
 * Different types of clef symbols.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export type ClefSign = EnumValues<typeof CLEF_SIGNS>;
export const CLEF_SIGNS = new Enum(['G', 'F', 'C', 'percussion', 'TAB', 'jianpu', 'none'] as const);

/**
 * The translation of the clef sign and line.
 *
 * See https://github.com/0xfe/vexflow/blob/ea48402cb22a312249719fdbdb0766240678156d/src/clef.ts#L68
 */
export type ClefType = EnumValues<typeof CLEF_TYPES>;
export const CLEF_TYPES = new Enum([
  'treble',
  'french',
  'subbass',
  'baritone-f',
  'bass',
  'baritone-c',
  'tenor',
  'mezzo-soprano',
  'soprano',
  'alto',
  'percussion',
] as const);

/**
 * The clef annotation derived from its octave change.
 *
 * See https://github.com/0xfe/vexflow/blob/ea48402cb22a312249719fdbdb0766240678156d/src/clef.ts#L133
 */
export type ClefAnnotation = EnumValues<typeof CLEF_ANNOTATIONS>;
export const CLEF_ANNOTATIONS = new Enum(['8vb', '8va'] as const);
