import { ABOVE_BELOW, LINE_TYPES, START_STOP_CONTINUE, Slur } from '@/musicxml';
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

  describe('getNumber', () => {
    it('returns the number of the slur', () => {
      const node = xml.slur({ number: 2 });
      const slur = new Slur(node);
      expect(slur.getNumber()).toBe(2);
    });

    it('defaults to 1 when missing', () => {
      const node = xml.slur();
      const slur = new Slur(node);
      expect(slur.getNumber()).toBe(1);
    });

    it('defaults to 1 when invalid', () => {
      const node = xml.slur({ number: NaN });
      const slur = new Slur(node);
      expect(slur.getNumber()).toBe(1);
    });
  });

  describe('getLineType', () => {
    it.each(LINE_TYPES.values)(`returns the line type of the slur: '%s'`, (lineType) => {
      const node = xml.slur({ lineType });
      const slur = new Slur(node);
      expect(slur.getLineType()).toBe(lineType);
    });

    it('defaults to solid when missing', () => {
      const node = xml.slur();
      const slur = new Slur(node);
      expect(slur.getLineType()).toBe('solid');
    });

    it('defaults to solid when invalid', () => {
      const node = xml.slur({ lineType: 'foo' });
      const slur = new Slur(node);
      expect(slur.getLineType()).toBe('solid');
    });
  });
});
