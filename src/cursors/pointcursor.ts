import * as spatial from '@/spatial';

/** Positional type makes it easier to use native events. */
type ClientPoint = {
  clientX: number;
  clientY: number;
};

export type CursorGetResult<T> = {
  point: spatial.Point;
  targets: T[];
  closestTarget: T | null;
};

/** A object that tracks a spatial cursor, and returns the targets under it. */
export class PointCursor<T> {
  private host: HTMLElement;
  private locator: spatial.PointLocator<T>;

  constructor(host: HTMLElement, locator: spatial.PointLocator<T>) {
    this.host = host;
    this.locator = locator;
  }

  get(clientPoint: ClientPoint): CursorGetResult<T> {
    const point = this.toPoint(clientPoint);
    let targets = this.locator.locate(point);
    targets = this.locator.sort(point, targets);
    const closestTarget = targets[0] ?? null;
    return { point, targets, closestTarget };
  }

  private toPoint(clientPoint: ClientPoint): spatial.Point {
    // This rect needs to be used to account for the host scroll position.
    const rect = this.host.getBoundingClientRect();
    const x = clientPoint.clientX - rect.left;
    const y = clientPoint.clientY - rect.top;
    return new spatial.Point(x, y);
  }
}
