import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, Renderable, RenderLayer } from './types';
import { Point, Rect } from '@/spatial';
import { RenderContext } from 'vexflow';

export class Gap implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point
  ) {}

  get rect(): Rect {
    const rects = this.getChildren().map((renderable) => renderable.rect);
    return Rect.merge(rects);
  }

  get layer(): RenderLayer {
    return 'background';
  }

  render(ctx: RenderContext): void {
    const children = this.getChildren();

    for (const child of children) {
      if (child.layer === 'background') {
        child.render(ctx);
      }
    }

    for (const child of children) {
      if (child.layer === 'foreground') {
        child.render(ctx);
      }
    }
  }

  @util.memoize()
  private getChildren(): Renderable[] {
    return [];
  }
}
