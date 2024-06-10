import { Point } from './point';
import { Rect } from './rect';

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
  private boundary: Rect;
  private capacity: number;
  private divided: boolean;
  private dataPoints: DataPoint<T>[];
  private northeast: QuadTree<T> | undefined;
  private northwest: QuadTree<T> | undefined;
  private southeast: QuadTree<T> | undefined;
  private southwest: QuadTree<T> | undefined;

  constructor(boundary: Rect, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.dataPoints = [];
    this.divided = false;
  }

  /**
   * Inserts a point into the QuadTree.
   * @returns true if the point was successfully inserted, false otherwise.
   */
  insert(dataPoint: DataPoint<T>): boolean {
    if (!this.boundary.contains(dataPoint.point)) {
      return false;
    }

    if (this.dataPoints.length < this.capacity) {
      this.dataPoints.push(dataPoint);
      return true;
    } else {
      if (!this.divided) {
        this.subdivide();
      }

      if (this.northeast!.insert(dataPoint)) {
        return true;
      } else if (this.northwest!.insert(dataPoint)) {
        return true;
      } else if (this.southeast!.insert(dataPoint)) {
        return true;
      } else if (this.southwest!.insert(dataPoint)) {
        return true;
      }
    }

    return false;
  }

  /** Returns the depth of the quad tree, defaulting to  */
  getDepth(): number {
    let maxDepth = 1;

    this.dfs((_, meta) => {
      if (meta.depth > maxDepth) {
        maxDepth = meta.depth;
      }
    });

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
  query(rectangle: Rect): DataPoint<T>[] {
    const found = new Array<DataPoint<T>>();

    this.dfs((tree: QuadTree<T>) => {
      if (tree.boundary.intersects(rectangle)) {
        for (const dataPoint of tree.dataPoints) {
          if (rectangle.contains(dataPoint.point)) {
            found.push(dataPoint);
          }
        }
      }
    });

    return found;
  }

  /** Performs an in-order depth-first search on the quad tree. */
  dfs(callback: (tree: QuadTree<T>, meta: { depth: number }) => void) {
    const dfs = (node: QuadTree<T>, meta: { depth: number }) => {
      if (node.divided) {
        const nextMeta = { depth: meta.depth + 1 };
        dfs(node.northeast!, nextMeta);
        dfs(node.northwest!, nextMeta);
        dfs(node.southeast!, nextMeta);
        dfs(node.southwest!, nextMeta);
      }
      callback(node, meta);
    };
    dfs(this, { depth: 0 });
  }

  /** Subdivides the QuadTree into four quadrants. */
  private subdivide(): void {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w / 2;
    const h = this.boundary.h / 2;

    const ne = new Rect(x + w, y, w, h);
    this.northeast = new QuadTree<T>(ne, this.capacity);
    const nw = new Rect(x, y, w, h);
    this.northwest = new QuadTree<T>(nw, this.capacity);
    const se = new Rect(x + w, y + h, w, h);
    this.southeast = new QuadTree<T>(se, this.capacity);
    const sw = new Rect(x, y + h, w, h);
    this.southwest = new QuadTree<T>(sw, this.capacity);

    this.divided = true;
  }
}
