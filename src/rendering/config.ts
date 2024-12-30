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
  TOP_PADDING: t.number({
    defaultValue: 40,
    help: 'TOP_PADDING is the vertical distance from the top of the rendering.',
  }),
  BOTTOM_PADDING: t.number({
    defaultValue: 40,
    help: 'TOP_PADDING is the vertical distance from the bottom of the rendering.',
  }),
  TITLE_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'TITLE_FONT_FAMILY is the font family for the title.',
  }),
  TITLE_FONT_SIZE: t.string({
    defaultValue: '36px',
    help: 'TITLE_FONT_SIZE is the font size for the title expressed in browser-compatible units.',
  }),
  TITLE_BOTTOM_PADDING: t.number({
    defaultValue: 20,
    help: 'TITLE_BOTTOM_PADDING is the vertical distance from the title to the first system.',
  }),
  PART_LABEL_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'PART_LABEL_FONT_FAMILY is the font family for part names.',
  }),
  PART_LABEL_FONT_SIZE: t.string({
    defaultValue: '13px',
    help: 'PART_LABEL_FONT_SIZE is the font size for part names expressed in browser-compatible units.',
  }),
};

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG);
