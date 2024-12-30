import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureKey, Renderable, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { RenderContext } from 'vexflow';

export class Measure implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureKey,
    private position: Point
  ) {}

  get rect(): Rect {
    const rects = this.getChildren().map((renderable) => renderable.rect);
    return Rect.merge(rects);
  }

  get layer(): RenderLayer {
    return 'background';
  }

  render(ctx: RenderContext): void {}

  private getChildren(): Renderable[] {
    return [];
  }
}
