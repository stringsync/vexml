import { Circle } from './circle';
import { Rect } from './rect';
import { Shape } from './types';

/** Represents a collision between two shapes. */
export class Collision {
  /** Creates a CollisionSubject for fluent APIs. */
  static is(shape: Shape) {
    return new CollisionSubject(shape);
  }
}

/**
 * A collision calculator that enables fluent APIs.
 *
 * This is done to reduce ambiguity of the semantics behind the collision checks.
 *
 * @example Collision.is(rect).collidingWith(circle); // boolean
 * @example Collision.is(circle).surroundedBy(rect); // boolean
 */
class CollisionSubject {
  private shape: Shape;

  constructor(shape: Shape) {
    this.shape = shape;
  }

  collidingWith(shape: Shape): boolean {
    const shape1 = this.shape;
    const shape2 = shape;

    if (shape1 instanceof Rect && shape2 instanceof Rect) {
      return this.isRectCollidingWithRect(shape1, shape2);
    }
    if (shape1 instanceof Rect && shape2 instanceof Circle) {
      return this.isRectCollidingWithCircle(shape1, shape2);
    }
    if (shape1 instanceof Circle && shape2 instanceof Rect) {
      return this.isRectCollidingWithCircle(shape2, shape1);
    }
    if (shape1 instanceof Circle && shape2 instanceof Circle) {
      return this.isCircleCollidingWithCircle(shape1, shape2);
    }
    throw new Error(`unsupported collision between ${shape1.constructor.name} and ${shape2.constructor.name}`);
  }

  surrounding(shape: Shape): boolean {
    const shape1 = this.shape;
    const shape2 = shape;

    if (shape1 instanceof Rect && shape2 instanceof Rect) {
      return this.isRectSurroundingRect(shape1, shape2);
    }
    if (shape1 instanceof Rect && shape2 instanceof Circle) {
      return this.isRectSurroundingCircle(shape1, shape2);
    }
    if (shape1 instanceof Circle && shape2 instanceof Rect) {
      return this.isCircleSurroundingRect(shape1, shape2);
    }
    if (shape1 instanceof Circle && shape2 instanceof Circle) {
      return this.isCircleSurroundingCircle(shape1, shape2);
    }
    throw new Error(`unsupported collision between ${shape1.constructor.name} and ${shape2.constructor.name}`);
  }

  private isRectCollidingWithRect(rect1: Rect, rect2: Rect) {
    return !(
      rect2.x > rect1.x + rect1.w ||
      rect2.x + rect2.w < rect1.x ||
      rect2.y > rect1.y + rect1.h ||
      rect2.y + rect2.h < rect1.y
    );
  }

  private isCircleCollidingWithCircle(circle1: Circle, circle2: Circle): boolean {
    return circle1.center().distance(circle2.center()) <= circle1.r + circle2.r;
  }

  private isRectCollidingWithCircle(rect: Rect, circle: Circle): boolean {
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

  private isRectSurroundingRect(rect1: Rect, rect2: Rect) {
    return (
      rect1.x > rect2.x &&
      rect1.y > rect2.y &&
      rect1.x + rect1.w < rect2.x + rect2.w &&
      rect1.y + rect1.h < rect2.y + rect2.h
    );
  }

  private isCircleSurroundingCircle(circle1: Circle, circle2: Circle) {
    const distance = circle1.center().distance(circle2.center());
    return distance + circle1.r < circle2.r;
  }

  private isRectSurroundingCircle(rect: Rect, circle: Circle) {
    const circleCenter = circle.center();
    const rectCenter = rect.center();
    const distanceX = Math.abs(circleCenter.x - rectCenter.x);
    const distanceY = Math.abs(circleCenter.y - rectCenter.y);
    const halfRectWidth = rect.w / 2;
    const halfRectHeight = rect.h / 2;
    if (distanceX > halfRectWidth || distanceY > halfRectHeight) {
      return false;
    }
    if (distanceX <= halfRectWidth - circle.r && distanceY <= halfRectHeight - circle.r) {
      return true;
    }
    const cornerDistanceSq = (distanceX - halfRectWidth) ** 2 + (distanceY - halfRectHeight) ** 2;
    return cornerDistanceSq <= circle.r ** 2;
  }

  private isCircleSurroundingRect(circle: Circle, rect: Rect) {
    const circleCenter = circle.center();
    const rectCenter = rect.center();
    const distanceX = Math.abs(circleCenter.x - rectCenter.x);
    const distanceY = Math.abs(circleCenter.y - rectCenter.y);
    const halfRectWidth = rect.w / 2;
    const halfRectHeight = rect.h / 2;

    if (distanceX > halfRectWidth + circle.r || distanceY > halfRectHeight + circle.r) {
      return false;
    }

    if (distanceX <= halfRectWidth || distanceY <= halfRectHeight) {
      return true;
    }

    const cornerDistanceSq = (distanceX - halfRectWidth) ** 2 + (distanceY - halfRectHeight) ** 2;

    return cornerDistanceSq <= circle.r ** 2;
  }
}
