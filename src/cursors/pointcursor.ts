import * as spatial from '@/spatial';

export class PointCursor<T extends any[]> {
  private locator: spatial.PointLocator<T>;
  private targets = new Array<T>();
  private point = spatial.Point.origin();

  constructor(locator: spatial.PointLocator<T>) {
    this.locator = locator;
  }

  update(point: spatial.Point) {
    this.point = point;
    this.targets = this.locator.locate(point);
  }

  getPoint(): spatial.Point {
    return this.point;
  }

  getTargets(): T[] {
    return this.targets;
  }
}
