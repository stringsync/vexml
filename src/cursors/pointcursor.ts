import * as spatial from '@/spatial';

/** A object that tracks a spatial cursor, and returns the targets under it. */
export class PointCursor<T> {
  private host: SVGElement | HTMLCanvasElement;
  private locator: spatial.PointLocator<T>;

  constructor(host: SVGElement | HTMLCanvasElement, locator: spatial.PointLocator<T>) {
    this.host = host;
    this.locator = locator;
  }

  get(positional: { clientX: number; clientY: number }): { point: spatial.Point; targets: T[] } {
    const point = this.point(positional.clientX, positional.clientY);
    const targets = this.locator.locate(point);
    return { point, targets };
  }

  private point(clientX: number, clientY: number): spatial.Point {
    // This rect needs to be used to account for the host scroll position.
    const rect = this.host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return new spatial.Point(x, y);
  }
}
