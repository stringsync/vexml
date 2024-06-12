import { Rect } from '@/spatial/rect';
import { Point } from '@/spatial/point';

describe(Rect, () => {
  describe('contains', () => {
    it('should return true if the point is on the upper-left corner of the rectangle', () => {
      const rectangle = new Rect(0, 0, 10, 10);
      const point = new Point(0, 0);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the lower-right corner of the rectangle', () => {
      const rectangle = new Rect(0, 0, 10, 10);
      const point = new Point(10, 10);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the upper-right corner of the rectangle', () => {
      const rectangle = new Rect(0, 0, 10, 10);
      const point = new Point(10, 0);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return true if the point is on the lower-left corner of the rectangle', () => {
      const rectangle = new Rect(0, 0, 10, 10);
      const point = new Point(0, 10);
      expect(rectangle.contains(point)).toBeTrue();
    });

    it('should return false if the point is outside the rectangle', () => {
      const rectangle = new Rect(0, 0, 10, 10);
      const point = new Point(15, 15);
      expect(rectangle.contains(point)).toBeFalse();
    });
  });
});
