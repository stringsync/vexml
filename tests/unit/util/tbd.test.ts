import { Tbd } from '@/util';

describe(Tbd, () => {
  describe('getInitial', () => {
    it('returns the initial value', () => {
      const tbd = new Tbd('hello');
      expect(tbd.getInitial()).toBe('hello');
    });
  });

  describe('getFinal', () => {
    it('returns the final value when set', () => {
      const tbd = new Tbd('hello');
      tbd.setFinal('world');
      expect(tbd.getFinal()).toBe('world');
    });

    it('throws when the final value is not set', () => {
      const tbd = new Tbd('hello');
      expect(() => tbd.getFinal()).toThrow();
    });
  });

  describe('setFinal', () => {
    it('sets the final value', () => {
      const tbd = new Tbd('hello');
      tbd.setFinal('world');
      expect(tbd.getFinal()).toBe('world');
    });

    it('throws when the final value is already set', () => {
      const tbd = new Tbd('hello');
      tbd.setFinal('world');
      expect(() => tbd.setFinal('mars')).toThrow();
    });
  });

  describe('reinitialize', () => {
    it('returns a new tbd with the same tbd value set', () => {
      const value1 = Symbol('initial');
      const value2 = Symbol('final');

      const tbd1 = new Tbd<symbol>(value1);
      tbd1.setFinal(value2);

      const tbd2 = tbd1.reinitialize();

      expect(tbd2.getInitial()).toBe(value1);
      expect(() => tbd2.getFinal()).toThrow();
    });
  });
});
