import { Position } from './position';
import { Size } from './size';

export interface Renderable {
  render(): void;
  getPosition(): Position;
  getSize(): Size;
}
