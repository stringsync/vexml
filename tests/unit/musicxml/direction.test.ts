import { Direction, DirectionType } from '@/musicxml';
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
});
