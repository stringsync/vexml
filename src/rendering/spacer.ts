import { Rect } from '@/spatial';
import { Renderable, RenderLayer } from './types';

export class Spacer implements Renderable {
  constructor(private space: Rect) {}

  static horizontal(x1: number, x2: number): Spacer {
    return new Spacer(new Rect(x1, 0, x2 - x1, 0));
  }

  static vertical(y1: number, y2: number): Spacer {
    return new Spacer(new Rect(y1, 0, 0, y2 - y1));
  }

  rect(): Rect {
    return this.space;
  }

  layer(): RenderLayer {
    return 'any';
  }

  children(): Renderable[] {
    return [];
  }

  render(): void {}
}
