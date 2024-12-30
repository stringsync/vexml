import { Rect } from '@/spatial';
import { Renderable } from './types';

export class Spacer implements Renderable {
  public readonly layer = 'background';

  constructor(public readonly rect: Rect) {}

  static horizontal(x1: number, x2: number): Spacer {
    return new Spacer(new Rect(x1, 0, x2 - x1, 0));
  }

  static vertical(y1: number, y2: number): Spacer {
    return new Spacer(new Rect(y1, 0, 0, y2 - y1));
  }

  render(): void {
    // noop
  }
}
