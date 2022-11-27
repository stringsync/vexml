import * as di from './di';

describe('createPartHandler', () => {
  it('runs without crashing', () => {
    expect(di.createContainer).not.toThrow();
  });
});
