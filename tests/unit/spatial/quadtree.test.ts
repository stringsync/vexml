import { DataPoint, QuadTree } from '@/spatial/quadtree';
import { Point } from '@/spatial/point';
import { Rectangle } from '@/spatial/rectangle';

describe(QuadTree, () => {
  let tree: QuadTree<number>;

  beforeEach(() => {
    const boundary = new Rectangle(0, 0, 100, 100);
    tree = new QuadTree(boundary, 4);
  });

  describe('insert', () => {
    it('should insert points correctly', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };

      expect(tree.insert(dataPoint1)).toBeTrue();
      expect(tree.insert(dataPoint2)).toBeTrue();
      expect(tree.insert(dataPoint3)).toBeTrue();
    });

    it('should not insert points outside the boundary', () => {
      const dataPoint = { point: new Point(110, 110), data: 0 };

      expect(tree.insert(dataPoint)).toBeFalse();
    });

    it('should query points within a given range', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);

      const result = tree.query(new Rectangle(0, 0, 25, 25));

      expect(result).toStrictEqual([dataPoint1, dataPoint2]);
    });

    it('should return an empty array when no points are found within the range', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);

      const result = tree.query(new Rectangle(100, 100, 150, 150));

      expect(result).toBeEmpty();
    });

    it('should respect the capacity of child quad trees', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };
      const dataPoint5 = { point: new Point(50, 50), data: 5 };
      const dataPoint6 = { point: new Point(60, 60), data: 6 };
      const dataPoint7 = { point: new Point(70, 70), data: 7 };
      const dataPoint8 = { point: new Point(80, 80), data: 8 };
      const dataPoint9 = { point: new Point(90, 90), data: 9 };
      const dataPoint10 = { point: new Point(100, 100), data: 10 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);
      tree.insert(dataPoint5);
      tree.insert(dataPoint6);
      tree.insert(dataPoint7);
      tree.insert(dataPoint8);
      tree.insert(dataPoint9);
      tree.insert(dataPoint10);

      expect(tree.getDepth()).toBeGreaterThan(1);

      tree.dfs((tree) => {
        expect(tree.getDataPoints().length).toBeLessThanOrEqual(4);
      });
    });

    it('should respect the capacity of nested child quad trees', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };
      const dataPoint5 = { point: new Point(50, 50), data: 5 };
      const dataPoint6 = { point: new Point(60, 60), data: 6 };
      const dataPoint7 = { point: new Point(70, 70), data: 7 };
      const dataPoint8 = { point: new Point(80, 80), data: 8 };
      const dataPoint9 = { point: new Point(90, 90), data: 9 };
      const dataPoint10 = { point: new Point(100, 100), data: 10 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);
      tree.insert(dataPoint5);
      tree.insert(dataPoint6);
      tree.insert(dataPoint7);
      tree.insert(dataPoint8);
      tree.insert(dataPoint9);
      tree.insert(dataPoint10);

      expect(tree.getDepth()).toBeGreaterThan(1);

      tree.dfs((tree) => {
        expect(tree.getDataPoints().length).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('getDepth', () => {
    it('should return the correct depth of the quad tree', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };
      const dataPoint5 = { point: new Point(50, 50), data: 5 };
      const dataPoint6 = { point: new Point(60, 60), data: 6 };
      const dataPoint7 = { point: new Point(70, 70), data: 7 };
      const dataPoint8 = { point: new Point(80, 80), data: 8 };
      const dataPoint9 = { point: new Point(90, 90), data: 9 };
      const dataPoint10 = { point: new Point(100, 100), data: 10 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);
      tree.insert(dataPoint5);
      tree.insert(dataPoint6);
      tree.insert(dataPoint7);
      tree.insert(dataPoint8);
      tree.insert(dataPoint9);
      tree.insert(dataPoint10);

      expect(tree.getDepth()).toBe(2);
    });
  });

  describe('getDataPoints', () => {
    it('should return an empty array when no points have been inserted', () => {
      expect(tree.getDataPoints()).toBeEmpty();
    });

    it('should return all the inserted data points', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);

      expect(tree.getDataPoints()).toStrictEqual([dataPoint1, dataPoint2, dataPoint3]);
    });
  });

  describe('query', () => {
    it('should return an empty array when no points are found within the range', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);

      const result = tree.query(new Rectangle(50, 50, 60, 60));
      expect(result).toBeEmpty();
    });

    it('should return all points within the range when the range covers the entire quad tree', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);

      const result = tree.query(new Rectangle(0, 0, 100, 100));
      expect(result).toStrictEqual([dataPoint1, dataPoint2, dataPoint3, dataPoint4]);
    });

    it('should return points within the range when the range partially overlaps with the quad tree', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);

      const result = tree.query(new Rectangle(15, 15, 35, 35));
      expect(result).toStrictEqual([dataPoint2, dataPoint3, dataPoint4]);
    });
  });

  describe('dfs', () => {
    it('should traverse the quad tree', () => {
      const dataPoint1 = { point: new Point(10, 10), data: 1 };
      const dataPoint2 = { point: new Point(20, 20), data: 2 };
      const dataPoint3 = { point: new Point(30, 30), data: 3 };
      const dataPoint4 = { point: new Point(40, 40), data: 4 };
      const dataPoint5 = { point: new Point(50, 50), data: 5 };
      const dataPoint6 = { point: new Point(60, 60), data: 6 };
      const dataPoint7 = { point: new Point(70, 70), data: 7 };
      const dataPoint8 = { point: new Point(80, 80), data: 8 };
      const dataPoint9 = { point: new Point(90, 90), data: 9 };
      const dataPoint10 = { point: new Point(100, 100), data: 10 };

      tree.insert(dataPoint1);
      tree.insert(dataPoint2);
      tree.insert(dataPoint3);
      tree.insert(dataPoint4);
      tree.insert(dataPoint5);
      tree.insert(dataPoint6);
      tree.insert(dataPoint7);
      tree.insert(dataPoint8);
      tree.insert(dataPoint9);
      tree.insert(dataPoint10);

      const points = new Array<DataPoint<number>>();

      tree.dfs((tree) => {
        points.push(...tree.getDataPoints());
      });

      expect(points).toIncludeSameMembers([
        dataPoint1,
        dataPoint2,
        dataPoint3,
        dataPoint4,
        dataPoint5,
        dataPoint6,
        dataPoint7,
        dataPoint8,
        dataPoint9,
        dataPoint10,
      ]);
    });
  });
});
