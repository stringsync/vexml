import { Point } from './point';
import { Rectangle } from './rectangle';

/**
 * Represents a QuadTree data structure.
 * @link https://en.wikipedia.org/wiki/Quadtree
 */
export class QuadTree {
  private boundary: Rectangle;
  private capacity: number;
  private divided: boolean;
  private points: Point[];
  private northeast: QuadTree | undefined;
  private northwest: QuadTree | undefined;
  private southeast: QuadTree | undefined;
  private southwest: QuadTree | undefined;

  constructor(boundary: Rectangle, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  /**
   * Inserts a point into the QuadTree.
   * @returns true if the point was successfully inserted, false otherwise.
   */
  insert(point: Point): boolean {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    } else {
      if (!this.divided) {
        this.subdivide();
      }

      if (this.northeast!.insert(point)) {
        return true;
      } else if (this.northwest!.insert(point)) {
        return true;
      } else if (this.southeast!.insert(point)) {
        return true;
      } else if (this.southwest!.insert(point)) {
        return true;
      }
    }

    return false;
  }

  /** Returns the depth of the quad tree, defaulting to  */
  getDepth(): number {
    let maxDepth = 1;

    const dfs = (tree: QuadTree, depth: number) => {
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

  /** Returns the points of the QuadTree node. */
  getPoints(): Point[] {
    return this.points;
  }

  /**
   * Queries the QuadTree for points within a given range.
   * @returns An array of points within the rectangle.
   */
  query(rectangle: Rectangle): Point[] {
    const found = new Array<Point>();

    const recurse = (tree: QuadTree) => {
      if (tree.boundary.intersects(rectangle)) {
        for (const point of tree.points) {
          if (rectangle.contains(point)) {
            found.push(point);
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

  dfs(callback: (tree: QuadTree) => void) {
    const stack: QuadTree[] = [];
    stack.push(this);

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
    this.northeast = new QuadTree(ne, this.capacity);
    const nw = new Rectangle(x, y, w, h);
    this.northwest = new QuadTree(nw, this.capacity);
    const se = new Rectangle(x + w, y + h, w, h);
    this.southeast = new QuadTree(se, this.capacity);
    const sw = new Rectangle(x, y + h, w, h);
    this.southwest = new QuadTree(sw, this.capacity);

    this.divided = true;
  }
}
