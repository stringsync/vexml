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
  DEBUG_DRAW_TARGET_BOUNDS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_TARGET_BOUNDS enables drawing of target bounds for debugging.',
  }),
};

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG);
