import { QuadTree } from '@/spatial/quadtree';
import { Point } from '@/spatial/point';
import { Rectangle } from '@/spatial/rectangle';

describe(QuadTree, () => {
  let tree: QuadTree;

  beforeEach(() => {
    const boundary = new Rectangle(0, 0, 100, 100);
    tree = new QuadTree(boundary, 4);
  });

  describe('insert', () => {
    it('should insert points correctly', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);

      expect(tree.insert(point1)).toBeTrue();
      expect(tree.insert(point2)).toBeTrue();
      expect(tree.insert(point3)).toBeTrue();
    });

    it('should not insert points outside the boundary', () => {
      const point = new Point(110, 110);

      expect(tree.insert(point)).toBeFalse();
    });

    it('should query points within a given range', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);

      const result = tree.query(new Rectangle(0, 0, 25, 25));

      expect(result).toStrictEqual([point1, point2]);
    });

    it('should return an empty array when no points are found within the range', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);

      const result = tree.query(new Rectangle(100, 100, 150, 150));

      expect(result).toBeEmpty();
    });

    it('should respect the capacity of child quad trees', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);
      const point5 = new Point(50, 50);
      const point6 = new Point(60, 60);
      const point7 = new Point(70, 70);
      const point8 = new Point(80, 80);
      const point9 = new Point(90, 90);
      const point10 = new Point(100, 100);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);
      tree.insert(point5);
      tree.insert(point6);
      tree.insert(point7);
      tree.insert(point8);
      tree.insert(point9);
      tree.insert(point10);

      expect(tree.getDepth()).toBeGreaterThan(1);

      tree.dfs((tree) => {
        expect(tree.getPoints().length).toBeLessThanOrEqual(4);
      });
    });

    it('should respect the capacity of nested child quad trees', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);
      const point5 = new Point(50, 50);
      const point6 = new Point(60, 60);
      const point7 = new Point(70, 70);
      const point8 = new Point(80, 80);
      const point9 = new Point(90, 90);
      const point10 = new Point(100, 100);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);
      tree.insert(point5);
      tree.insert(point6);
      tree.insert(point7);
      tree.insert(point8);
      tree.insert(point9);
      tree.insert(point10);

      expect(tree.getDepth()).toBeGreaterThan(1);

      tree.dfs((tree) => {
        expect(tree.getPoints().length).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('getDepth', () => {
    it('should return the correct depth of the quad tree', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);
      const point5 = new Point(50, 50);
      const point6 = new Point(60, 60);
      const point7 = new Point(70, 70);
      const point8 = new Point(80, 80);
      const point9 = new Point(90, 90);
      const point10 = new Point(100, 100);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);
      tree.insert(point5);
      tree.insert(point6);
      tree.insert(point7);
      tree.insert(point8);
      tree.insert(point9);
      tree.insert(point10);

      expect(tree.getDepth()).toBe(2);
    });
  });

  describe('getPoints', () => {
    it('should return an empty array when no points have been inserted', () => {
      expect(tree.getPoints()).toBeEmpty();
    });

    it('should return all the inserted points', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);

      expect(tree.getPoints()).toStrictEqual([point1, point2, point3]);
    });
  });

  describe('query', () => {
    it('should return an empty array when no points are found within the range', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);

      const result = tree.query(new Rectangle(50, 50, 60, 60));
      expect(result).toBeEmpty();
    });

    it('should return all points within the range when the range covers the entire quad tree', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);

      const result = tree.query(new Rectangle(0, 0, 100, 100));
      expect(result).toStrictEqual([point1, point2, point3, point4]);
    });

    it('should return points within the range when the range partially overlaps with the quad tree', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);

      const result = tree.query(new Rectangle(15, 15, 35, 35));
      expect(result).toStrictEqual([point2, point3, point4]);
    });
  });

  describe('dfs', () => {
    it('should traverse the quad tree', () => {
      const point1 = new Point(10, 10);
      const point2 = new Point(20, 20);
      const point3 = new Point(30, 30);
      const point4 = new Point(40, 40);
      const point5 = new Point(50, 50);
      const point6 = new Point(60, 60);
      const point7 = new Point(70, 70);
      const point8 = new Point(80, 80);
      const point9 = new Point(90, 90);
      const point10 = new Point(100, 100);

      tree.insert(point1);
      tree.insert(point2);
      tree.insert(point3);
      tree.insert(point4);
      tree.insert(point5);
      tree.insert(point6);
      tree.insert(point7);
      tree.insert(point8);
      tree.insert(point9);
      tree.insert(point10);

      const points = new Array<Point>();

      tree.dfs((tree) => {
        points.push(...tree.getPoints());
      });

      expect(points).toIncludeSameMembers([
        point1,
        point2,
        point3,
        point4,
        point5,
        point6,
        point7,
        point8,
        point9,
        point10,
      ]);
    });
  });
});
