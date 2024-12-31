import * as schema from '@/schema';
import { t } from '@/schema';

export type Config = schema.Config<typeof CONFIG>;

export const CONFIG = {
  DRAWING_BACKEND: t.enum({
    defaultValue: 'svg',
    help: 'DRAWING_BACKEND specifies the rendering backend to use.',
    choices: ['svg', 'canvas'] as const,
  }),
  WIDTH: t.number({
    defaultValue: null,
    help: 'WIDTH specifies the width of the rendered score.',
  }),
  HEIGHT: t.number({
    defaultValue: null,
    help: 'HEIGHT specifies the maximum height of the rendered score.',
  }),
  SCORE_PADDING_TOP: t.number({
    defaultValue: 40,
    help: 'TOP_PADDING is the vertical distance from the top of the rendering.',
  }),
  SCORE_PADDING_BOTTOM: t.number({
    defaultValue: 40,
    help: 'SCORE_PADDING_BOTTOM is the vertical distance from the bottom of the rendering.',
  }),
  TITLE_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'TITLE_FONT_FAMILY is the font family for the title.',
  }),
  TITLE_FONT_SIZE: t.string({
    defaultValue: '36px',
    help: 'TITLE_FONT_SIZE is the font size for the title expressed in browser-compatible units.',
  }),
  TITLE_PADDING_BOTTOM: t.number({
    defaultValue: 20,
    help: 'TITLE_BOTTOM_PADDING is the vertical distance from the title to the first system.',
  }),
  SYSTEM_PADDING_BOTTOM: t.number({
    defaultValue: 80,
    help: 'DEFAULT_SYSTEM_DISTANCE is the vertical distance between systems',
  }),
  PART_LABEL_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'PART_LABEL_FONT_FAMILY is the font family for part names.',
  }),
  PART_LABEL_FONT_SIZE: t.string({
    defaultValue: '13px',
    help: 'PART_LABEL_FONT_SIZE is the font size for part names expressed in browser-compatible units.',
  }),
  PART_LABEL_PADDING_RIGHT: t.number({
    defaultValue: 6,
    help: 'PART_LABEL_PADDING_RIGHT is the horizontal distance from part labels to the first measure.',
  }),
  SLOW_WARNING_THRESHOLD_MS: t.number({
    defaultValue: 1,
    help: 'SLOW_WARNING_THRESHOLD_MS is the threshold for a slow operation warning in milliseconds.',
  }),
};

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG);
