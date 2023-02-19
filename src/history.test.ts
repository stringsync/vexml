import { History } from './history';

describe(History, () => {
  describe('set', () => {
    it('sets the current and previous value', () => {
      const history = new History<number>();

      history.set(0);
      history.set(1);

      expect(history.getPrevious()).toBe(0);
      expect(history.getCurrent()).toBe(1);
    });
  });

  describe('getCurrent', () => {
    it('returns the current value', () => {
      const history = new History<number>();
      history.set(0);
      expect(history.getCurrent()).toBe(0);
    });

    it('returns null when no value set', () => {
      const history = new History();
      expect(history.getCurrent()).toBeNull();
    });

    it('returns initial value when constructed with one', () => {
      const history = new History(0);
      expect(history.getCurrent()).toBe(0);
    });
  });

  describe('getPrevious', () => {
    it('returns the previous value', () => {
      const history = new History<number>();

      history.set(0);
      history.set(1);

      expect(history.getPrevious()).toBe(0);
    });

    it('returns null initially', () => {
      const history = new History();
      expect(history.getPrevious()).toBeNull();
    });
  });
});
