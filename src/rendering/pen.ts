import * as util from '@/util';
import { Point } from '@/spatial';
import { Stack } from '@/util';

/**
 * Pen is a position tracker.
 *
 * The term "cursor" is overloaded in the codebase, so this is a simple alternative.
 */
export class Pen {
  private positions = new Stack<Point>();

  constructor(initialPosition = Point.origin()) {
    this.positions.push(initialPosition);
  }

  get x(): number {
    return this.position().x;
  }

  get y(): number {
    return this.position().y;
  }

  position(): Point {
    const position = this.positions.peek();
    util.assertDefined(position);
    return position;
  }

  moveTo(point: { x: number; y: number }): void {
    this.positions.pop();
    this.positions.push(new Point(point.x, point.y));
  }

  moveBy(opts: { dx?: number; dy?: number }): void {
    const dx = opts.dx ?? 0;
    const dy = opts.dy ?? 0;
    const position = this.position();
    this.moveTo({ x: position.x + dx, y: position.y + dy });
  }

  clone(): Pen {
    const pen = new Pen();
    pen.positions = this.positions.clone();
    return pen;
  }

  save(): void {
    this.positions.push(this.position());
  }

  restore(): void {
    if (this.positions.size() > 1) {
      this.positions.pop();
    }
  }
}
