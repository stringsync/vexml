import { BarlineHandler } from './barlinehandler';
import { MeasureHandler } from './measurehandler';
import { PartHandler } from './parthandler';
import { TodoHandler } from './todohandler';

/**
 * Creates a dependency injection container.
 */
export const createContainer = () => {
  const attributesHandler = new TodoHandler();
  const barlineHandler = new BarlineHandler();
  const noteHandler = new TodoHandler();

  const measureHandler = new MeasureHandler({
    attributesHandler,
    barlineHandler,
    noteHandler,
  });

  const partHandler = new PartHandler({
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
