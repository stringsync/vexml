import { Point } from './point';
import { Shape } from './types';

/** Represents a rectangle in a 2D coordinate system. */
export class Rect implements Shape {
  /** Upper-left corner x coordinate */
  public readonly x: number;
  /** Upper-left corner y coordinate */
  public readonly y: number;
  /** Total width */
  public readonly w: number;
  /** Total height */
  public readonly h: number;

  constructor(opts: { x: number; y: number; w: number; h: number }) {
    this.x = opts.x;
    this.y = opts.y;
    this.w = opts.w;
    this.h = opts.h;
  }

  origin(): Point {
    return new Point(this.x, this.y);
  }

  center(): Point {
    return new Point(this.x + this.w / 2, this.y + this.h / 2);
  }

  contains(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
  }
}
