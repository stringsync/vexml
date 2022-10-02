import { NoopReceiver } from './noopreceiver';

describe('NoopReceiver', () => {
  it('runs without crashing', () => {
    const receiver = new NoopReceiver();
    expect(() => receiver.onMessage()).not.toThrow();
  });
});
