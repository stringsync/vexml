import { BarlineHandler } from './barlinehandler';
import { MeasureHandler } from './measurehandler';
import { NodeHandler } from './nodehandler';
import { PartHandler } from './parthandler';
import { TodoHandler } from './todohandler';

/**
 * Creates the handler dependency chain for PartHandler.
 */
export const createPartHandler = (): NodeHandler<'part'> => {
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

  return partHandler;
};
