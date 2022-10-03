/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BarlineHandler } from './barlinehandler';
import { MeasureHandler } from './measurehandler';
import { PartHandler } from './parthandler';
import { TodoHandler } from './todohandler';
import { VexmlConfig } from './types';

export const DEFAULT_CONFIG: VexmlConfig = Object.freeze({
  DEFAULT_MEASURE_WIDTH_PX: 100,
  DEFAULT_MEASURE_NUM_STAVES: 0,
  DEFAULT_PART_ID: 'NN',
});

/**
 * Creates a dependency injection container.
 */
export const createContainer = (opts?: { config: Partial<VexmlConfig> }) => {
  const config = { ...DEFAULT_CONFIG, ...opts?.config };

  const attributesHandler = new TodoHandler();
  const barlineHandler = new BarlineHandler();
  const noteHandler = new TodoHandler();

  const measureHandler = new MeasureHandler({
    config: config,
    attributesHandler,
    barlineHandler,
    noteHandler,
  });

  const partHandler = new PartHandler({
    config: config,
    measureHandler,
  });

  return {
    attributesHandler,
    barlineHandler,
    noteHandler,
    measureHandler,
    partHandler,
  } as const;
};
