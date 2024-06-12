import { Collision } from './collision';
import { Point } from './point';
import { Rect } from './rect';
import { Shape } from './types';

type QuadTreeEntry<T> = {
  data: T;
  shape: Shape;
};

/**
 * Represents a QuadTree data structure that can store shapes in a 2D space.
 * @link https://en.wikipedia.org/wiki/Quadtree
 */
export class QuadTree<T> {
  private boundary: Rect;
  private threshold: number;
  private entries: QuadTreeEntry<T>[];
  private northeast: QuadTree<T> | undefined;
  private northwest: QuadTree<T> | undefined;
  private southeast: QuadTree<T> | undefined;
  private southwest: QuadTree<T> | undefined;

  /**
   * @param boundary The boundary of the QuadTree.
   * @param threshold The number of entries in a node before it subdivides. A tree's entry size can exceed this.
   */
  constructor(boundary: Rect, threshold: number) {
    this.boundary = boundary;
    this.threshold = threshold;
    this.entries = [];
  }

  /**
   * Inserts a shape into the QuadTree.
   * @returns true if the point was successfully inserted, false otherwise.
   */
  insert(shape: Shape, data: T): boolean {
    // If the shape is not completely surrounded by the boundary, do not insert it. We want to make sure that when we
    // query a quad tree, we are able to find the shape.
    if (!Collision.is(shape).surroundedBy(this.boundary)) {
      return false;
    }

    if (this.entries.length < this.threshold) {
      this.entries.push({ shape, data });
      return true;
    }

    if (!this.isDivided()) {
      this.subdivide();
    }

    // Quadrants are assumed to have no overlap, so we only need to try to fit it in one of them.
    if (this.northeast!.insert(shape, data)) {
      return true;
    }
    if (this.northwest!.insert(shape, data)) {
      return true;
    }
    if (this.southeast!.insert(shape, data)) {
      return true;
    }
    if (this.southwest!.insert(shape, data)) {
      return true;
    }

    // If the bounding box cannot be completely surrounded by any quadrant, store it in the current tree. This may cause
    // the threshold to be exceeded, but this is expected to be rare. We expect that music sheets are O(1000) shapes in
    // the most extreme cases and that the spatial distribution of the shapes should be mostly uniform.
    this.entries.push({ shape, data });
    return true;
  }

  /** Given a point, returns all the shapes that contain it. */
  query(point: Point): T[] {
    const found = new Array<T>();

    const dfs = (tree: QuadTree<T>) => {
      for (const { shape, data } of tree.entries) {
        if (shape.contains(point)) {
          found.push(data);
        }
      }
      if (tree?.isDivided()) {
        dfs(tree.northeast!);
        dfs(tree.northwest!);
        dfs(tree.southwest!);
        dfs(tree.southeast!);
      }
    };

    dfs(this);

    return found;
  }

  /**
   * Returns the max number of entries in any tree node in the quad tree.
   *
   * Callers can use this to approximate the balance of the quad tree. If the tree is relatively balanced, then the max
   * number of entries in any node should be less than or equal to the threshold. If the tree is unbalanced, then the
   * max number of entries in any node will be much greater than the threshold.
   *
   * Balance of the tree indicates its performance. For example, if you insert N points, but the maxTreeEntryCount is N,
   * that suggests the query performance will be O(N). At this extreme, the caller should consider a different threshold
   * or a different data structure.
   */
  maxTreeEntryCount(): number {
    let max = this.entries.length;

    const dfs = (tree: QuadTree<T>) => {
      max = Math.max(max, tree.entries.length);
      if (tree.isDivided()) {
        dfs(tree.northeast!);
        dfs(tree.northwest!);
        dfs(tree.southwest!);
        dfs(tree.southeast!);
      }
    };

    dfs(this);

    return max;
  }

  private isDivided() {
    // Assume that if northeast is defined, then all children are defined.
    return this.northeast !== undefined;
  }

  private subdivide() {
    const [northeast, northwest, southwest, southeast] = this.boundary.quadrants();
    this.northeast = new QuadTree(northeast, this.threshold);
    this.northwest = new QuadTree(northwest, this.threshold);
    this.southwest = new QuadTree(southwest, this.threshold);
    this.southeast = new QuadTree(southeast, this.threshold);
  }
}
