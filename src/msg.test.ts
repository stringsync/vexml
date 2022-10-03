import * as msg from './msg';

describe('msg', () => {
  for (const [name, fn] of Object.entries(msg)) {
    describe(name, () => {
      it('runs without crashing', () => {
        expect(fn).not.toThrow();
      });
    });
  }
});
