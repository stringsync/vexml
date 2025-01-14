import { EnumValues, Enum } from '@/util';

export type KeyMode = EnumValues<typeof KEY_MODES>;
export const KEY_MODES = new Enum([
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
  'tab',
] as const);

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

/** Represents the direction of a stem on a note. */
export type StemDirection = EnumValues<typeof STEM_DIRECTIONS>;
export const STEM_DIRECTIONS = new Enum(['auto', 'up', 'down', 'none'] as const);

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
] as const);

/**
 * The tied-type type is used as an attribute of the tied element to specify where the visual representation of a tie
 * begins and ends.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/tied-type/
 */
export type TiedPhase = EnumValues<typeof TIED_PHASE>;
export const TIED_PHASE = new Enum(['start', 'stop', 'continue'] as const);

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
