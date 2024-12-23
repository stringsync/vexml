import { SchemaConfig, t } from './t';

export type Schema = typeof CONFIG_SCHEMA;

export type Config = SchemaConfig<Schema>;

export const CONFIG_SCHEMA = {
  DEFAULT_SYSTEM_DISTANCE: t.number({
    defaultValue: 80,
    help:
      'DEFAULT_SYSTEM_DISTANCE is the vertical distance between systems.' +
      "It won't have an effect if there is only one system.",
  }),
  DEFAULT_STAVE_DISTANCE: t.number({
    defaultValue: 140,
    help:
      'DEFAULT_STAVE_DISTANCE is the vertical distance between staves within the same part and system. ' +
      "It won't have an effect if there is only one stave per part.",
  }),
  TITLE_TOP_PADDING: t.number({
    defaultValue: 40,
    help: 'TITLE_TOP_PADDING is the vertical distance between the title and the first system.',
  }),
  TITLE_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'TITLE_FONT_FAMILY is the font family for the title.',
  }),
  TITLE_FONT_SIZE: t.string({
    defaultValue: '36px',
    help: 'TITLE_FONT_SIZE is the font size for the title expressed in browser-compatible units.',
  }),
  REHEARSAL_FONT_FAMILY: t.string({
    defaultValue: 'Times New Roman',
    help: 'REHEARSAL_FONT_FAMILY is the font family for rehearsal marks.',
  }),
  REHEARSAL_FONT_SIZE: t.string({
    defaultValue: '16px',
    help: 'REHEARSAL_FONT_SIZE is the font size for rehearsal marks expressed in browser-compatible units.',
  }),
  PART_NAME_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'PART_NAME_FONT_FAMILY is the font family for part names.',
  }),
  PART_NAME_FONT_SIZE: t.string({
    defaultValue: '13px',
    help: 'PART_NAME_FONT_SIZE is the font size for part names expressed in browser-compatible units.',
  }),
  PART_DISTANCE: t.number({
    defaultValue: 80,
    help:
      'PART_DISTANCE is the vertical distance between parts of a system. ' +
      "It won't have an effect if there is only one part per system.",
  }),
  VOICE_PADDING: t.number({
    defaultValue: 80,
    help: 'VOICE_PADDING is how much extra width to give each voice in a measure.',
  }),
  MULTI_MEASURE_REST_WIDTH: t.number({
    defaultValue: 200,
    help: 'MULTI_MEASURE_REST_WIDTH is the width of multi-measure rests.',
  }),
  MEASURE_NUMBERING_SCHEME: t.enum({
    choices: ['all', 'every2', 'every3', 'system', 'none'] as const,
    defaultValue: 'all',
    help: 'MEASURE_NUMBERING_SCHEME is the scheme for numbering measures.',
  }),
  INPUT_TYPE: t.enum({
    choices: ['auto', 'none', 'mouse', 'touch', 'hybrid'] as const,
    defaultValue: 'auto',
    help: 'INPUT_TYPE is the type of inputs to use for interaction.',
  }),
  DEBUG_DRAW_TARGET_BOUNDS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_TARGET_BOUNDS enables drawing of target bounds for debugging.',
  }),
} as const;

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG_SCHEMA);
