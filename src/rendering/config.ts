import * as schema from '@/schema';
import { t } from '@/schema';

export type Config = schema.Config<typeof CONFIG>;

export const CONFIG = {
  DEBUG_DRAW_TARGET_BOUNDS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_TARGET_BOUNDS enables drawing of target bounds for debugging.',
  }),
};

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG);
