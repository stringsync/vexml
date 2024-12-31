import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, Renderable, RenderContext, RenderLayer } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';

export class Stave implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null
  ) {}

  rect(): Rect {
    // TODO: Use a real rect.
    return new Rect(this.position.x, this.position.y, 100, 100);
  }

  /** The rect ignoring children. */
  childlessRect(): Rect {
    const vexflowStave = this.getVexflowStave();
    return Rect.fromRectLike(vexflowStave.getBoundingBox());
  }

  layer(): RenderLayer {
    return 'staves';
  }

  children(): Renderable[] {
    return [];
  }

  render(ctx: RenderContext): void {
    this.getVexflowStave().setContext(ctx).draw();
  }

  private getVexflowStave(): vexflow.Stave {
    return new vexflow.Stave(this.position.x, this.position.y, this.width ?? this.getIntrinsicWidth());
  }

  private getIntrinsicWidth(): number {
    return 100;
  }
}
