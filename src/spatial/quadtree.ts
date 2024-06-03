import { Point } from './point';
import { Rectangle } from './rectangle';

/** Data and a point that are associated with each other. */
export type DataPoint<T> = {
  data: T;
  point: Point;
};

/**
 * Represents a QuadTree data structure.
 * @link https://en.wikipedia.org/wiki/Quadtree
 */
export class QuadTree<T> {
  private boundary: Rectangle;
  private capacity: number;
  private divided: boolean;
  private dataPoints: DataPoint<T>[];
  private northeast: QuadTree<T> | undefined;
  private northwest: QuadTree<T> | undefined;
  private southeast: QuadTree<T> | undefined;
  private southwest: QuadTree<T> | undefined;

  constructor(boundary: Rectangle, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.dataPoints = [];
    this.divided = false;
  }

  /**
   * Inserts a point into the QuadTree.
   * @returns true if the point was successfully inserted, false otherwise.
   */
  insert(point: Point, data: T): boolean {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.dataPoints.length < this.capacity) {
      this.dataPoints.push({ data, point });
      return true;
    } else {
      if (!this.divided) {
        this.subdivide();
      }

      if (this.northeast!.insert(point, data)) {
        return true;
      } else if (this.northwest!.insert(point, data)) {
        return true;
      } else if (this.southeast!.insert(point, data)) {
        return true;
      } else if (this.southwest!.insert(point, data)) {
        return true;
      }
    }

    return false;
  }

  /** Returns the depth of the quad tree, defaulting to  */
  getDepth(): number {
    let maxDepth = 1;

    const dfs = (tree: QuadTree<T>, depth: number) => {
      if (depth > maxDepth) {
        maxDepth = depth;
      }

      if (tree.divided) {
        dfs(tree.northeast!, depth + 1);
        dfs(tree.northwest!, depth + 1);
        dfs(tree.southeast!, depth + 1);
        dfs(tree.southwest!, depth + 1);
      }
    };

    dfs(this, 0);

    return maxDepth;
  }

  /** Returns the data points of the QuadTree node. */
  getDataPoints(): DataPoint<T>[] {
    return this.dataPoints;
  }

  /**
   * Queries the QuadTree for points within a given range.
   * @returns An array of points within the rectangle.
   */
  query(rectangle: Rectangle): DataPoint<T>[] {
    const found = new Array<DataPoint<T>>();

    const recurse = (tree: QuadTree<T>) => {
      if (tree.boundary.intersects(rectangle)) {
        for (const dataPoint of tree.dataPoints) {
          if (rectangle.contains(dataPoint.point)) {
            found.push(dataPoint);
          }
        }
        if (this.divided) {
          this.northwest!.dfs(recurse);
          this.northeast!.dfs(recurse);
          this.southwest!.dfs(recurse);
          this.southeast!.dfs(recurse);
        }
      }
    };

    this.dfs(recurse);

    return found;
  }

  dfs(callback: (tree: QuadTree<T>) => void) {
    const stack: QuadTree<T>[] = [this];

    while (stack.length > 0) {
      const tree = stack.pop()!;

      callback(tree);

      if (tree.divided) {
        stack.push(tree.northeast!);
        stack.push(tree.northwest!);
        stack.push(tree.southeast!);
        stack.push(tree.southwest!);
      }
    }
  }

  /** Subdivides the QuadTree into four quadrants. */
  private subdivide(): void {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w / 2;
    const h = this.boundary.h / 2;

    const ne = new Rectangle(x + w, y, w, h);
    this.northeast = new QuadTree<T>(ne, this.capacity);
    const nw = new Rectangle(x, y, w, h);
    this.northwest = new QuadTree<T>(nw, this.capacity);
    const se = new Rectangle(x + w, y + h, w, h);
    this.southeast = new QuadTree<T>(se, this.capacity);
    const sw = new Rectangle(x, y + h, w, h);
    this.southwest = new QuadTree<T>(sw, this.capacity);

    this.divided = true;
  }
}
