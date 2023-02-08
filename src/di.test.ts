import * as di from './di';

describe('createContainer', () => {
  it('runs without crashing', () => {
    expect(di.createContainer).not.toThrow();
  });
});
