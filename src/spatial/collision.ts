import { Circle } from './circle';
import { Rect } from './rect';
import { Shape } from './types';

// NOTE: This was modeled as a class instead of a collection of functions because we may need to create Collision
// instances with additional data and _methods_. For now, we just need to know a boolean.

/** Represents a collision between two shapes. */
export class Collision {
  /** Returns whether a collision exists between the two shapes. */
  static detect(shape1: Shape, shape2: Shape): boolean {
    if (shape1 instanceof Rect && shape2 instanceof Rect) {
      return Collision.rectRect(shape1, shape2);
    }
    if (shape1 instanceof Rect && shape2 instanceof Circle) {
      return Collision.rectCircle(shape1, shape2);
    }
    if (shape1 instanceof Circle && shape2 instanceof Rect) {
      return Collision.rectCircle(shape2, shape1);
    }
    if (shape1 instanceof Circle && shape2 instanceof Circle) {
      return Collision.circleCircle(shape1, shape2);
    }
    throw new Error(`unsupported collision between ${shape1.constructor.name} and ${shape2.constructor.name}`);
  }

  private static rectRect(rect1: Rect, rect2: Rect) {
    return !(
      rect2.x > rect1.x + rect1.w ||
      rect2.x + rect2.w < rect1.x ||
      rect2.y > rect1.y + rect1.h ||
      rect2.y + rect2.h < rect1.y
    );
  }

  private static circleCircle(circle1: Circle, circle2: Circle): boolean {
    return circle1.center().distance(circle2.center()) <= circle1.r + circle2.r;
  }

  private static rectCircle(rect: Rect, circle: Circle): boolean {
    if (rect.contains(circle.center())) {
      return true;
    }
    if (circle.contains(rect.center())) {
      return true;
    }

    const x = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
    const y = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
    const dx = circle.x - x;
    const dy = circle.y - y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }
}
