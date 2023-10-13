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
});
