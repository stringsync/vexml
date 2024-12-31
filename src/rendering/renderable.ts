import { Rect } from '@/spatial';
import { RenderContext, RenderLayer } from './types';

/** Renderable represents an entity that has dimensions and can be rendered to a context. */
export abstract class Renderable {
  #rect: Rect | undefined = undefined;

  get rect(): Rect {
    if (!this.#rect) {
      this.#rect = Rect.merge(this.children().map((renderable) => renderable.rect));
    }
    return this.#rect;
  }

  abstract layer(): RenderLayer;

  abstract children(): Renderable[];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(ctx: RenderContext): void {}
}
