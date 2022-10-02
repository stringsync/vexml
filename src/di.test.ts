import * as di from './di';
import { PartHandler } from './parthandler';

describe('createPartHandler', () => {
  it('runs without crashing', () => {
    expect(di.createPartHandler).not.toThrow();
  });

  it('creates a PartHandler instance', () => {
    const partHandler = di.createPartHandler();
    expect(partHandler).toBeInstanceOf(PartHandler);
  });
});
