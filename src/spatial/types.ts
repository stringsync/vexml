import { Point } from './point';

/** Represents a 2D shape in a spatial system. */
export interface Shape {
  /** Checks if the shape contains a given point. */
  contains(point: Point): boolean;

  /** Returns the minimum X. */
  getMinX(): number;

  /** Returns the maximum X. */
  getMaxX(): number;

  /** Returns the minimum Y. */
  getMinY(): number;

  /** Returns the maximum Y. */
  getMaxY(): number;
}
