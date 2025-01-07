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
