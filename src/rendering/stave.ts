import { Position } from './position';
import { Size } from './size';
import { Renderable } from './types';

export class Stave implements Renderable {
  private position = Position.zero();
  private size = Size.zero();

  getPosition(): Position {
    return this.position;
  }

  getSize(): Size {
    return this.size;
  }

  render(): void {
    // TODO
  }
}
