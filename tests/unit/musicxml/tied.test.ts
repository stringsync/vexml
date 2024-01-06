import { xml } from '@/util';
import { ABOVE_BELOW, LINE_TYPES, TIED_TYPES, Tied } from '@/musicxml';

describe(Tied, () => {
  describe('getType', () => {
    it.each(TIED_TYPES.values)(`returns the type of tie: '%s'`, (type) => {
      const node = xml.tied({ type });
      const tied = new Tied(node);
      expect(tied.getType()).toBe(type);
    });

    it('defaults to null when not present', () => {
      const node = xml.tied();
      const tied = new Tied(node);
      expect(tied.getType()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.tied({ type: 'foo' });
      const tied = new Tied(node);
      expect(tied.getType()).toBeNull();
    });
  });

  describe('getPlacement', () => {
    it.each(ABOVE_BELOW.values)(`returns the placement of the tie: %s''`, (placement) => {
      const node = xml.tied({ placement });
      const tied = new Tied(node);
      expect(tied.getPlacement()).toBe(placement);
    });

    it('defaults to null when not present', () => {
      const node = xml.tied();
      const tied = new Tied(node);
      expect(tied.getPlacement()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.tied({ placement: 'foo' });
      const tied = new Tied(node);
      expect(tied.getPlacement()).toBeNull();
    });
  });

  describe('getNumber', () => {
    it('returns the number of the tie', () => {
      const node = xml.tied({ number: 2 });
      const tied = new Tied(node);
      expect(tied.getNumber()).toBe(2);
    });

    it('defaults to 1 when missing', () => {
      const node = xml.tied();
      const tied = new Tied(node);
      expect(tied.getNumber()).toBe(1);
    });

    it('defaults to 1 when invalid', () => {
      const node = xml.tied({ number: NaN });
      const tied = new Tied(node);
      expect(tied.getNumber()).toBe(1);
    });
  });

  describe('getLineType', () => {
    it.each(LINE_TYPES.values)(`returns the line type of the tie: '%s'`, (lineType) => {
      const node = xml.tied({ lineType });
      const tied = new Tied(node);
      expect(tied.getLineType()).toBe(lineType);
    });

    it('defaults to solid when not present', () => {
      const node = xml.tied();
      const tied = new Tied(node);
      expect(tied.getLineType()).toBe('solid');
    });

    it('defaults to solid when invalid', () => {
      const node = xml.tied({ lineType: 'foo' });
      const tied = new Tied(node);
      expect(tied.getLineType()).toBe('solid');
    });
  });
});
