import * as spatial from '@/spatial';

export class PointCursor<T> {
  private tree: spatial.QuadTree<T>;
  private targets = new Array<T>();
  private point = spatial.Point.origin();

  constructor(tree: spatial.QuadTree<T>) {
    this.tree = tree;
  }

  update(point: spatial.Point) {
    this.point = point;
    const rect = new spatial.Rect(this.point.x - 10, this.point.y - 10, 20, 20);
    this.targets = this.tree.query(rect).map((dataPoint) => dataPoint.data);
  }

  getPoint(): spatial.Point {
    return this.point;
  }

  getTargets(): T[] {
    return this.targets;
  }
}
