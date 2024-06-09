/** Represents a point in 2D space. */
export class Point {
  constructor(public readonly x: number, public readonly y: number) {}

  distance(other: Point): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}
