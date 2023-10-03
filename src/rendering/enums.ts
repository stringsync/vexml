import { EnumValues, Enum } from '@/util';

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
  '',
] as const);

/**
 * The direction of the stem of a note.
 */
export type StemDirection = EnumValues<typeof STEM_DIRECTIONS>;
export const STEM_DIRECTIONS = new Enum(['up', 'down', 'none', 'auto'] as const);
