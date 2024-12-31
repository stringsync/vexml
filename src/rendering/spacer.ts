import { Rect } from '@/spatial';
import { RenderLayer } from './types';
import { Renderable } from './renderable';

export class Spacer extends Renderable {
  private constructor(private space: Rect) {
    super();
  }

  static horizontal(x: number, y: number, w: number): Spacer {
    return new Spacer(new Rect(x, y, w, 0));
  }

  static vertical(x: number, y: number, h: number): Spacer {
    return new Spacer(new Rect(x, y, 0, h));
  }

  static rect(x: number, y: number, w: number, h: number): Spacer {
    return new Spacer(new Rect(x, y, w, h));
  }

  static empty(): Spacer {
    return new Spacer(Rect.empty());
  }

  get rect() {
    return this.space;
  }

  children(): Renderable[] {
    return [];
  }

  render(): void {}
}
