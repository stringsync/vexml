import { ABOVE_BELOW, Direction, DirectionType } from '@/musicxml';
import { xml } from '@/util';

describe(Direction, () => {
  describe('getTypes', () => {
    it('returns the direction types of the direction', () => {
      const type1 = xml.directionType({
        codas: [xml.coda()],
      });
      const type2 = xml.directionType({
        segnos: [xml.segno()],
      });
      const node = xml.direction({
        types: [type1, type2],
      });

      const direction = new Direction(node);

      expect(direction.getTypes()).toStrictEqual([new DirectionType(type1), new DirectionType(type2)]);
    });

    it('defaults to an empty array when direction types are missing', () => {
      const node = xml.direction();
      const direction = new Direction(node);
      expect(direction.getTypes()).toBeEmpty();
    });
  });

  describe('getPlacement', () => {
    it.each(ABOVE_BELOW.values)(`returns the placement of the direction: '%s'`, (placement) => {
      const node = xml.direction({ placement });
      const direction = new Direction(node);
      expect(direction.getPlacement()).toBe(placement);
    });

    it('defaults to null when the placement is invalid', () => {
      const node = xml.direction({ placement: 'foo' });
      const direction = new Direction(node);
      expect(direction.getPlacement()).toBeNull();
    });

    it('defaults to null when the placement is missing', () => {
      const node = xml.direction();
      const direction = new Direction(node);
      expect(direction.getPlacement()).toBeNull();
    });
  });
});
