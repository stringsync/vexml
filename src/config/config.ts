import { SchemaConfig, t } from './t';

export type Schema = typeof CONFIG_SCHEMA;

export type Config = SchemaConfig<Schema>;

export const CONFIG_SCHEMA = {
  DEFAULT_SYSTEM_DISTANCE: t.number(80),
  DEFAULT_STAVE_DISTANCE: t.number(140),
  TITLE_TOP_PADDING: t.number(40),
  TITLE_FONT_FAMILY: t.string('Arial'),
  TITLE_FONT_SIZE: t.string('36px'),
  REHEARSAL_FONT_FAMILY: t.string('Times New Roman'),
  REHEARSAL_FONT_SIZE: t.string('16px'),
  PART_NAME_FONT_FAMILY: t.string('Arial'),
  PART_NAME_FONT_SIZE: t.string('13px'),
  PART_DISTANCE: t.number(80),
  VOICE_PADDING: t.number(80),
  MULTI_MEASURE_REST_WIDTH: t.number(200),
  ENABLE_MEASURE_NUMBERS: t.boolean(true),
  INPUT_TYPE: t.enum(['auto', 'none', 'mouse', 'touch', 'hybrid'] as const),
  DEBUG_DRAW_TARGET_BOUNDS: t.boolean(false),
} as const;

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG_SCHEMA);
