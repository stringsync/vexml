import * as util from '@/util';
import { Point } from '@/spatial';
import { Stack } from '@/util';

/**
 * A mutable cursor context to simplify tracking positions across scopes.
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

  moveTo(x: number, y: number): void {
    this.positions.pop();
    this.positions.push(new Point(x, y));
  }

  moveBy(opts: { dx?: number; dy?: number }): void {
    const dx = opts.dx ?? 0;
    const dy = opts.dy ?? 0;
    const position = this.position();
    this.moveTo(position.x + dx, position.y + dy);
  }

  save(): void {
    const position = this.position();
    const copy = new Point(position.x, position.y);
    this.positions.push(copy);
  }

  restore(): void {
    if (this.positions.size() > 1) {
      this.positions.pop();
    }
  }
}
