import { ABOVE_BELOW, START_STOP_CONTINUE, Slur } from '@/musicxml';
import { xml } from '@/util';

describe(Slur, () => {
  describe('getType', () => {
    it.each(START_STOP_CONTINUE.values)(`returns the type of slur: '%s'`, (type) => {
      const node = xml.slur({ type });
      const slur = new Slur(node);
      expect(slur.getType()).toBe(type);
    });

    it('defaults to null when not present', () => {
      const node = xml.slur();
      const slur = new Slur(node);
      expect(slur.getType()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.slur({ type: 'foo' });
      const slur = new Slur(node);
      expect(slur.getType()).toBeNull();
    });
  });

  describe('getPlacement', () => {
    it.each(ABOVE_BELOW.values)(`returns the placement of the slur: %s''`, (placement) => {
      const node = xml.slur({ placement });
      const slur = new Slur(node);
      expect(slur.getPlacement()).toBe(placement);
    });

    it('defaults to null when not present', () => {
      const node = xml.slur();
      const slur = new Slur(node);
      expect(slur.getPlacement()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.slur({ placement: 'foo' });
      const slur = new Slur(node);
      expect(slur.getPlacement()).toBeNull();
    });
  });
});
