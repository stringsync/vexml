/** Represents a point in 2D space. */
export class Point {
  constructor(public readonly x: number, public readonly y: number) {}

  static origin(): Point {
    return new Point(0, 0);
  }

  distance(other: Point): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  isEqual(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
