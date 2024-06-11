import { Point } from './point';

/** Represents a rectangle in a 2D coordinate system. */
export class LegacyRect {
  constructor(
    /** Upper-left corner x coordinate */
    public readonly x: number,
    /** Upper-left corner y coordinate */
    public readonly y: number,
    /** Total width */
    public readonly w: number,
    /** Total height */
    public readonly h: number
  ) {}

  /** Creates a Rectangle at (0, 0) with the specified width and height. */
  static origin(w: number, h: number) {
    return new LegacyRect(0, 0, w, h);
  }

  /** Checks if a given point is inside the rectangle. */
  contains(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
  }

  /** Checks if the rectangle intersects with another rectangle. */
  intersects(rect: LegacyRect): boolean {
    return !(
      rect.x > this.x + this.w ||
      rect.x + rect.w < this.x ||
      rect.y > this.y + this.h ||
      rect.y + rect.h < this.y
    );
  }

  center(): Point {
    return new Point(this.x + this.w / 2, this.y + this.h / 2);
  }

  corners(): [Point, Point, Point, Point] {
    return [
      new Point(this.x, this.y),
      new Point(this.x + this.w, this.y),
      new Point(this.x + this.w, this.y + this.h),
      new Point(this.x, this.y + this.h),
    ];
  }
}
