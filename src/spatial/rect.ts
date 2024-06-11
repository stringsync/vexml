import { Point } from './point';
import { Shape } from './types';

/** Represents a rectangle in a 2D coordinate system. */
export class Rect implements Shape {
  constructor(
    /** upper-left corner x-coordinate */
    public readonly x: number,
    /** upper-left corner y-coordinate */
    public readonly y: number,
    /** total width */
    public readonly w: number,
    /** total height */
    public readonly h: number
  ) {}

  origin(): Point {
    return new Point(this.x, this.y);
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

  contains(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
  }
}
