import { Point } from './point';
import { Shape } from './types';

export class Circle implements Shape {
  /** The x-coordinate of the center of the circle. */
  public readonly x: number;

  /** The y-coordinate of the center of the circle. */
  public readonly y: number;

  /** The radius of the circle. */
  public readonly r: number;

  constructor(opts: { x: number; y: number; r: number }) {
    this.x = opts.x;
    this.y = opts.y;
    this.r = opts.r;
  }

  center(): Point {
    return new Point(this.x, this.y);
  }

  contains(point: Point): boolean {
    return this.center().distance(point) <= this.r;
  }
}
