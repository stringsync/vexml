import { Renderable } from './types';

type CoordinateGetter = () => number;

export class Position {
  static zero(): Position {
    return Position.absolute(0, 0);
  }

  static absolute(x: number, y: number): Position {
    return new Position(
      () => x,
      () => y
    );
  }

  static relative(renderable: Renderable, offset: Position): Position {
    return new Position(
      () => renderable.getPosition().getX() + offset.getX(),
      () => renderable.getPosition().getY() + offset.getY()
    );
  }

  public readonly getX: CoordinateGetter;
  public readonly getY: CoordinateGetter;

  private constructor(getX: CoordinateGetter, getY: CoordinateGetter) {
    this.getX = getX;
    this.getY = getY;
  }
}
