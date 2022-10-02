import { NoopHandler } from './noophandler';

describe('NoopHandler', () => {
  it('runs without crashing', () => {
    const handler = new NoopHandler();
    expect(() => handler.sendMessages()).not.toThrow();
  });
});
