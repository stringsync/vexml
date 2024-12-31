import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { MeasureEntryKey, Renderable, RenderContext, RenderLayer } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Spacer } from './spacer';

const TODO_WIDTH = 200;
const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;

export class Stave implements Renderable {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureEntryKey,
    private position: Point,
    private width: number | null,
    private includeDescendants: boolean
  ) {}

  rect(): Rect {
    const rects = this.children().map((renderable) => renderable.rect());
    return Rect.merge(rects);
  }

  layer(): RenderLayer {
    return 'staves';
  }

  children(): Renderable[] {
    const children = new Array<Renderable>();

    const staveRepresentative = this.getVexflowStaveRepresentative();
    children.push(staveRepresentative);

    if (this.includeDescendants) {
      // TODO: Include voices.
    }

    return children;
  }

  render(ctx: RenderContext): void {
    this.getVexflowStave().setContext(ctx).draw();
  }

  private getVexflowStave(): vexflow.Stave {
    const x = this.position.x + this.getStaveOffsetX();
    const y = this.position.y;
    const width = this.width ?? this.getIntrinsicWidth();
    return new vexflow.Stave(x, y, width)
      .setMeasure(this.document.getMeasure(this.key).label)
      .setEndBarType(vexflow.Barline.type.SINGLE);
  }

  /**
   * Returns a spacer that represents the vexflow stave's true bounding box. We need to use this instead of the bounding
   * box because it doesn't account for the measure label nor the end barline.
   */
  private getVexflowStaveRepresentative(): Spacer {
    // eslint-disable-next-line prefer-const
    const { h } = this.getVexflowStave().getBoundingBox();
    const x = this.position.x;
    const y = this.position.y;
    const w = (this.width ?? this.getIntrinsicWidth()) + this.getStaveOffsetWidth() + this.getStaveOffsetX();
    return Spacer.rect(x, y, w, h);
  }

  /**
   * The vexflow stave's bounding box does not account for the measure number. This method returns the x offset needed
   * to account for it.
   */
  private getStaveOffsetX(): number {
    const isFirstSystem = this.key.systemIndex === 0;
    const isFirstSystemMeasure = this.key.measureIndex === 0;
    if (!isFirstSystem && isFirstSystemMeasure) {
      return MEASURE_NUMBER_PADDING_LEFT;
    }
    return 0;
  }

  /**
   * The vexflow stave's bounding box does not account for the end barline. This method returns the width offset needed
   * to account for it.
   */
  private getStaveOffsetWidth(): number {
    const isLastSystemMeasure = this.key.measureIndex === this.document.getMeasureCount(this.key) - 1;
    if (isLastSystemMeasure) {
      return BARLINE_WIDTH;
    }
    return 0;
  }

  private getIntrinsicWidth(): number {
    return TODO_WIDTH;
  }
}
