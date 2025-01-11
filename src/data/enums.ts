import { Enum, EnumValues } from '@/util';

/**
 * The direction of the stem of a note.
 */
export type StemDirection = EnumValues<typeof STEM_DIRECTIONS>;
export const STEM_DIRECTIONS = new Enum(['auto', 'up', 'down', 'none'] as const);

/**
 * The translation of the clef sign and line.
 *
 * See https://github.com/0xfe/vexflow/blob/ea48402cb22a312249719fdbdb0766240678156d/src/clef.ts#L68
 */
export type ClefSign = EnumValues<typeof CLEF_SIGNS>;
export const CLEF_SIGNS = new Enum([
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
  'tab',
] as const);

/**
 * The <mode> element is used to specify major/minor and other mode distinctions.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/mode/
 */
export type KeyMode = EnumValues<typeof KEY_MODES>;
const KEY_MODES = new Enum([
  'none',
  'major',
  'minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'ionian',
  'locrian',
] as const);

/**
 * The accidental code from VexFlow. The list only contains typical accidentals from Western music and is currently not
 * exhaustive.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L169
 */
export type AccidentalCode = EnumValues<typeof ACCIDENTAL_CODES>;
export const ACCIDENTAL_CODES = new Enum(['#', '##', 'b', 'bb', 'n', 'd', '_', 'db', '+', '++'] as const);

/**
 * The suffix for a fully qualified key.
 *
 * See https://github.com/0xfe/vexflow/blob/974fe1aaf5bb6270577053200a59c87b32d99d31/src/tables.ts#L817
 */
export type Notehead = EnumValues<typeof NOTEHEADS>;
export const NOTEHEADS = new Enum([
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
 * Indicates how to display a time signature.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/time-symbol/
 */
export type TimeSymbol = EnumValues<typeof TIME_SYMBOLS>;
export const TIME_SYMBOLS = new Enum([
  'common',
  'cut',
  'dotted-note',
  'normal',
  'note',
  'single-number',
  'hidden',
] as const);

/**
 * The horizontal justification of an annotation.
 *
 * See https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/annotation.ts#L19
 */
export type AnnotationHorizontalJustification = EnumValues<typeof ANNOTATION_HORIZONTAL_JUSTIFICATIONS>;
export const ANNOTATION_HORIZONTAL_JUSTIFICATIONS = new Enum(['left', 'center', 'right', 'centerstem'] as const);

/**
 * The vertical justification of an annotation.
 *
 * See https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/annotation.ts#L26
 */
export type AnnotationVerticalJustification = EnumValues<typeof ANNOTATION_VERTICAL_JUSTIFICATIONS>;
export const ANNOTATION_VERTICAL_JUSTIFICATIONS = new Enum(['top', 'center', 'bottom', 'centerstem'] as const);

/**
 * DurationType corresponds to the fraction duration of a note. The values are vexflow-specific.
 *
 * See https://github.com/0xfe/vexflow/blob/17755d786eae1670ee20e8101463b3368f2c06e5/src/tables.ts#L16.
 */
export type DurationType = EnumValues<typeof DURATION_TYPES>;
export const DURATION_TYPES = new Enum([
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
] as const);

/**
 * CurvePlacement is the placement of the curve relative to the note.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/#:~:text=any%20notation%20type.-,placement,-above%2Dbelow
 */
export type CurvePlacement = EnumValues<typeof CURVE_PLACEMENTS>;
export const CURVE_PLACEMENTS = new Enum(['auto', 'above', 'below'] as const);

/**
 * CurveOpening is the direction of the curve opening.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/#:~:text=MusicXML%20document%20order.-,orientation,-over%2Dunder
 */
export type CurveOpening = EnumValues<typeof CURVE_OPENING>;
export const CURVE_OPENING = new Enum(['auto', 'up', 'down'] as const);

/**
 * The above-below type is used to indicate whether one element appears above or below another element.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/above-below/
 */
export type TupletPlacement = EnumValues<typeof TUPLET_PLACEMENTS>;
export const TUPLET_PLACEMENTS = new Enum(['above', 'below'] as const);

/**
 * The ending bracket type, which could be used for ending starts or ending ends.
 *
 * See https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/stavevolta.ts#L7
 */
export type EndingBracketType = EnumValues<typeof ENDING_BRACKET_TYPES>;
export const ENDING_BRACKET_TYPES = new Enum(['none', 'begin', 'mid', 'end', 'beginend'] as const);

/**
 * The barline style of a measure.
 *
 * See https://github.com/vexflow/vexflow/blob/d602715b1c05e21d3498f78b8b5904cb47ad3795/src/stavebarline.ts#L10
 */
export type BarlineStyle = EnumValues<typeof BARLINE_STYLES>;
export const BARLINE_STYLES = new Enum([
  'single',
  'double',
  'end',
  'repeatstart',
  'repeatend',
  'repeatboth',
  'none',
] as const);

/** The repetition symbol of a measure. */
export type RepetitionSymbol = EnumValues<typeof REPETITION_SYMBOLS>;
export const REPETITION_SYMBOLS = new Enum(['segno', 'coda'] as const);

/**
 * The different kinds of dynamics.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/dynamics/
 */
export type DynamicType = EnumValues<typeof DYNAMIC_TYPES>;
export const DYNAMIC_TYPES = new Enum([
  'p',
  'pp',
  'ppp',
  'pppp',
  'ppppp',
  'pppppp',
  'f',
  'ff',
  'fff',
  'ffff',
  'fffff',
  'ffffff',
  'mp',
  'mf',
  'sf',
  'sfp',
  'sfpp',
  'fp',
  'rf',
  'rfz',
  'sfz',
  'sffz',
  'fz',
  'n',
  'pf',
  'sfzp',
] as const);

export type WedgeType = EnumValues<typeof WEDGE_TYPES>;
export const WEDGE_TYPES = new Enum(['crescendo', 'diminuendo'] as const);

export type WedgePlacement = EnumValues<typeof WEDGE_PLACEMENTS>;
export const WEDGE_PLACEMENTS = new Enum(['above', 'below'] as const);

export type PedalType = EnumValues<typeof PEDAL_TYPES>;
export const PEDAL_TYPES = new Enum(['bracket', 'mixed', 'text'] as const);

export type PedalMarkType = EnumValues<typeof PEDAL_MARK_TYPES>;
export const PEDAL_MARK_TYPES = new Enum(['default', 'change'] as const);

export type ArticulationType = EnumValues<typeof ARTICULATION_TYPES>;
export const ARTICULATION_TYPES = new Enum([
  'upright-normal-fermata',
  'upright-angled-fermata',
  'upright-square-fermata',
  'inverted-normal-fermata',
  'inverted-angled-fermata',
  'inverted-square-fermata',
  'harmonic',
  'open-string',
  'double-tongue',
  'triple-tongue',
  'stopped',
  'snap-pizzicato',
  'tap',
  'heel',
  'toe',
  'upstroke',
  'downstroke',
  'accent',
  'strong-accent',
  'staccato',
  'tenuto',
  'detached-legato',
  'staccatissimo',
  'scoop',
  'doit',
  'falloff',
  'breath-mark',
  'arpeggio-roll-down',
  'arpeggio-roll-up',
  'arpeggio-directionless',
] as const);

export type ArticulationPlacement = EnumValues<typeof ARTICULATION_PLACEMENTS>;
export const ARTICULATION_PLACEMENTS = new Enum(['above', 'below'] as const);

export type BendType = EnumValues<typeof BEND_TYPES>;
export const BEND_TYPES = new Enum(['prebend', 'normal', 'release'] as const);
