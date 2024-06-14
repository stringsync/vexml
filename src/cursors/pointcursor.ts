import * as spatial from '@/spatial';

/** A object that tracks a spatial cursor, and returns the targets under it. */
export class PointCursor<T> {
  private locator: spatial.PointLocator<T>;
  private point = spatial.Point.origin();

  constructor(locator: spatial.PointLocator<T>) {
    this.locator = locator;
  }

  update(point: spatial.Point) {
    this.point = point;
  }

  getPoint(): spatial.Point {
    return this.point;
  }

  getTargets(): T[] {
    return this.locator.locate(this.point);
  }
}
