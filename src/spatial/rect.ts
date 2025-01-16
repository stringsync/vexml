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

  static fromRectLike(rectLike: { x: number; y: number; w: number; h: number }): Rect {
    return new Rect(rectLike.x, rectLike.y, rectLike.w, rectLike.h);
  }

  static fromShape(shape: Shape) {
    return new Rect(shape.left(), shape.top(), shape.right() - shape.left(), shape.bottom() - shape.top());
  }

  static empty() {
    return new Rect(0, 0, 0, 0);
  }

  static merge(rects: Rect[]): Rect {
    if (rects.length === 0) {
      return Rect.empty();
    }
    const x = Math.min(...rects.map((rect) => rect.x));
    const y = Math.min(...rects.map((rect) => rect.y));
    const w = Math.max(...rects.map((rect) => rect.x + rect.w)) - x;
    const h = Math.max(...rects.map((rect) => rect.y + rect.h)) - y;
    return new Rect(x, y, w, h);
  }

  origin(): Point {
    return new Point(this.x, this.y);
  }

  center(): Point {
    return new Point(this.x + this.w / 2, this.y + this.h / 2);
  }

  topLeft(): Point {
    return new Point(this.x, this.y);
  }

  topRight(): Point {
    return new Point(this.x + this.w, this.y);
  }

  bottomLeft(): Point {
    return new Point(this.x, this.y + this.h);
  }

  bottomRight(): Point {
    return new Point(this.x + this.w, this.y + this.h);
  }

  translate(opts: { dx?: number; dy?: number }): Rect {
    const dx = opts.dx ?? 0;
    const dy = opts.dy ?? 0;
    return new Rect(this.x + dx, this.y + dy, this.w, this.h);
  }

  quadrants(): [topRight: Rect, topLeft: Rect, bottomLeft: Rect, bottomRight: Rect] {
    const halfWidth = this.w / 2;
    const halfHeight = this.h / 2;
    const topRight = new Rect(this.x + halfWidth, this.y, halfWidth, halfHeight);
    const topLeft = new Rect(this.x, this.y, halfWidth, halfHeight);
    const bottomLeft = new Rect(this.x, this.y + halfHeight, halfWidth, halfHeight);
    const bottomRight = new Rect(this.x + halfWidth, this.y + halfHeight, halfWidth, halfHeight);
    return [topRight, topLeft, bottomLeft, bottomRight];
  }

  contains(point: Point): boolean {
    return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
  }

  toRectLike(): { x: number; y: number; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  left(): number {
    return this.x;
  }

  right(): number {
    return this.x + this.w;
  }

  top(): number {
    // NOTE: This assumes that the rectangle is not rotated.
    return this.y;
  }

  bottom(): number {
    // NOTE: This assumes that the rectangle is not rotated.
    return this.y + this.h;
  }
}
