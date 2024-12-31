import { Rect } from '@/spatial';
import { Renderable, RenderLayer } from './types';

export class Spacer implements Renderable {
  constructor(private space: Rect) {}

  static horizontal(x: number, y: number, w: number): Spacer {
    return new Spacer(new Rect(x, y, w, 0));
  }

  static vertical(x: number, y: number, h: number): Spacer {
    return new Spacer(new Rect(x, y, 0, h));
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
