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

/**
 * The vertical direction of arrows and other pointed symbols.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/up-down/
 */
export type VerticalDirection = 'up' | 'down';

/**
 * Notated accidentals supported by MusicXML.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/accidental-value/
 */
export type AccidentalType =
  | 'sharp'
  | 'natural'
  | 'flat'
  | 'double-sharp'
  | 'sharp-sharp'
  | 'flat-flat'
  | 'natural-sharp'
  | 'natural-flat'
  | 'quarter-flat'
  | 'quarter-sharp'
  | 'three-quarters-flat'
  | 'three-quarters-sharp'
  | 'sharp-down'
  | 'sharp-up'
  | 'natural-down'
  | 'natural-up'
  | 'flat-down'
  | 'flat-up'
  | 'double-sharp-down'
  | 'double-sharp-up'
  | 'flat-flat-down'
  | 'flat-flat-up'
  | 'arrow-down'
  | 'arrow-up'
  | 'triple-sharp'
  | 'triple-flat'
  | 'slash-quarter-sharp'
  | 'slash-sharp'
  | 'slash-flat'
  | 'double-slash-flat'
  | 'flat-1'
  | 'flat-2'
  | 'flat-3'
  | 'flat-4'
  | 'sori'
  | 'koron'
  | 'other';

/**
 * The accidental code from VexFlow. The list only contains typical accidentals from Western music and is currently not
 * exhaustive.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L169
 */
export type AccidentalCode = '#' | '##' | 'b' | 'bb' | 'n';

/**
 * Notehead shapes other than the open and closed ovals associated with note durations.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/notehead-value/
 */
export type Notehead =
  | 'arrow down'
  | 'arrow up'
  | 'back slashed'
  | 'circle dot'
  | 'circle-x'
  | 'circled'
  | 'cluster'
  | 'cross'
  | 'diamond'
  | 'do'
  | 'fa'
  | 'fa up'
  | 'inverted triangle'
  | 'la'
  | 'left triangle'
  | 'mi'
  | 'none'
  | 'normal'
  | 're'
  | 'rectangle'
  | 'slash'
  | 'slashed'
  | 'so'
  | 'square'
  | 'ti'
  | 'triangle'
  | 'x'
  | 'other';

/**
 * The suffix for a fully qualified key.
 *
 * See https://github.com/0xfe/vexflow/blob/974fe1aaf5bb6270577053200a59c87b32d99d31/src/tables.ts#L817
 */
export type NoteheadSuffix =
  | ''
  | 'D0'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'T0'
  | 'T1'
  | 'T2'
  | 'T3'
  | 'X0'
  | 'X1'
  | 'X2'
  | 'X3'
  | 'S1'
  | 'S2'
  | 'R1'
  | 'R2'
  | 'DO'
  | 'RE'
  | 'MI'
  | 'FA'
  | 'FAUP'
  | 'SO'
  | 'LA'
  | 'TI'
  | 'D'
  | 'H'
  | 'N'
  | 'G'
  | 'M'
  | 'X'
  | 'CX'
  | 'CI'
  | 'S'
  | 'SQ'
  | 'TU'
  | 'TD'
  | 'SF'
  | 'SB';

/**
 * The bar style of a measure.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/bar-style/
 */
export type BarStyle =
  | 'dashed'
  | 'dotted'
  | 'heavy'
  | 'heavy-heavy'
  | 'heavy-light'
  | 'light-heavy'
  | 'light-light'
  | 'none'
  | 'regular'
  | 'short'
  | 'tick';

/**
 * The direction of a repeat.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/backward-forward/
 */
export type RepeatDirection = 'backward' | 'forward';

/**
 * The location of a barline.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/right-left-middle/
 */
export type BarlineLocation = 'right' | 'left' | 'middle';

/**
 * The ending type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/start-stop-discontinue/
 */
export type EndingType = 'start' | 'stop' | 'discontinue';

/**
 * Different types of clef symbols.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'jianpu' | 'none';

/**
 * The translation of the clef sign and line.
 *
 * See https://github.com/0xfe/vexflow/blob/ea48402cb22a312249719fdbdb0766240678156d/src/clef.ts#L68
 */
export type ClefType =
  | 'treble'
  | 'french'
  | 'subbass'
  | 'baritone-f'
  | 'bass'
  | 'baritone-c'
  | 'tenor'
  | 'mezzo-soprano'
  | 'soprano'
  | 'alto'
  | 'percussion';

/**
 * The clef annotation derived from its octave change.
 *
 * See https://github.com/0xfe/vexflow/blob/ea48402cb22a312249719fdbdb0766240678156d/src/clef.ts#L133
 */
export type ClefAnnotation = '8vb' | '8va';
