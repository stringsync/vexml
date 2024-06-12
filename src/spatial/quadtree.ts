import { Collision } from './collision';
import { Point } from './point';
import { Rect } from './rect';
import { Shape } from './types';

type QuadTreeEntry<T> = {
  data: T;
  shape: Shape;
};

/**
 * Represents a QuadTree data structure.
 * @link https://en.wikipedia.org/wiki/Quadtree
 */
export class QuadTree<T> {
  private boundary: Rect;
  private capacity: number;
  private entries: QuadTreeEntry<T>[];
  private northeast: QuadTree<T> | undefined;
  private northwest: QuadTree<T> | undefined;
  private southeast: QuadTree<T> | undefined;
  private southwest: QuadTree<T> | undefined;

  constructor(boundary: Rect, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.entries = [];
  }

  /**
   * Inserts a point into the QuadTree.
   * @returns true if the point was successfully inserted, false otherwise.
   */
  insert(shape: Shape, data: T): boolean {
    if (!Collision.detect(this.boundary, shape)) {
      return false;
    }

    if (this.entries.length < this.capacity) {
      this.entries.push({ shape, data });
      return true;
    }

    if (!this.isDivided()) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(shape, data) ||
      this.northwest!.insert(shape, data) ||
      this.southeast!.insert(shape, data) ||
      this.southwest!.insert(shape, data)
    );
  }

  query(point: Point): T[] {
    const found = new Array<T>();

    const dfs = (tree?: QuadTree<T>) => {
      if (typeof tree === 'undefined') {
        return;
      }
      for (const { shape, data } of tree.entries) {
        if (shape.contains(point)) {
          found.push(data);
        }
      }
      dfs(tree.northeast);
      dfs(tree.northwest);
      dfs(tree.southwest);
      dfs(tree.southeast);
    };

    dfs(this);

    return found;
  }

  private isDivided() {
    // Assume that if northeast is defined, then all children are defined.
    return this.northeast !== undefined;
  }

  private subdivide() {
    const [northeast, northwest, southwest, southeast] = this.boundary.quadrants();
    this.northeast = new QuadTree(northeast, this.capacity);
    this.northwest = new QuadTree(northwest, this.capacity);
    this.southwest = new QuadTree(southwest, this.capacity);
    this.southeast = new QuadTree(southeast, this.capacity);
  }
}
