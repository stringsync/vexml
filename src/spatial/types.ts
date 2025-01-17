import { Point } from './point';

/** Represents a 2D shape in a spatial system. */
export interface Shape {
  /** Checks if the shape contains a given point. */
  contains(point: Point): boolean;

  /** Returns the minimum X. */
  left(): number;

  /** Returns the maximum X. */
  right(): number;

  /** Returns the minimum Y. */
  top(): number;

  /** Returns the maximum Y. */
  bottom(): number;
}
