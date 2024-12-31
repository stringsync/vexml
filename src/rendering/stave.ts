import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Pen } from './pen';

const TODO_WIDTH = 200;
const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;

export type StaveRender = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  vexflowStave: vexflow.Stave;
};

export class Stave {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: StaveKey,
    private position: Point,
    private width: number | null
  ) {}

  render(): StaveRender {
    const pen = new Pen(this.position);

    pen.save();
    const vexflowStave = this.renderVexflowStave(pen);
    pen.restore();

    const rect = this.getVexflowStaveRectRepresentative(vexflowStave, pen);

    return {
      type: 'stave',
      key: this.key,
      rect,
      vexflowStave,
    };
  }

  private renderVexflowStave(pen: Pen): vexflow.Stave {
    const isFirstMeasure = this.key.measureIndex === 0;
    const isLastMeasure = this.key.measureIndex === this.document.getMeasureCount(this.key) - 1;
    const isLastMeasureEntry = this.key.measureEntryIndex === this.document.getMeasureEntryCount(this.key) - 1;
    const isFirstPart = this.key.partIndex === 0;
    const isFirstStave = this.key.staveIndex === 0;

    let x = pen.x;
    if (isFirstMeasure) {
      x += MEASURE_NUMBER_PADDING_LEFT;
    }

    const y = pen.y;

    let width = this.width ?? this.getIntrinsicWidth();
    if (isFirstMeasure) {
      width -= MEASURE_NUMBER_PADDING_LEFT;
    }
    if (isLastMeasure && isLastMeasureEntry) {
      width -= BARLINE_WIDTH;
    }

    const vexflowStave = new vexflow.Stave(x, y, width);

    if (isFirstStave) {
      vexflowStave.setBegBarType(vexflow.Barline.type.SINGLE);
    } else {
      vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
    }

    if (isLastMeasure && isLastMeasureEntry) {
      vexflowStave.setEndBarType(vexflow.Barline.type.SINGLE);
    } else {
      vexflowStave.setEndBarType(vexflow.Barline.type.NONE);
    }

    if (isFirstPart) {
      vexflowStave.setMeasure(this.document.getMeasure(this.key).label);
    }

    return vexflowStave;
  }

  /**
   * Returns a rect that represents the vexflow stave's true bounding box. We need to use this instead of the vexflow
   * bounding box because it doesn't account for the measure label nor the end barline.
   */
  private getVexflowStaveRectRepresentative(vexflowStave: vexflow.Stave, pen: Pen): Rect {
    const box = vexflowStave.getBoundingBox();

    const x = pen.x;
    const y = pen.y;
    const w = this.width ?? this.getIntrinsicWidth();
    const h = box.h;

    return new Rect(x, y, w, h);
  }

  private getIntrinsicWidth(): number {
    return Math.min(this.config.WIDTH ?? TODO_WIDTH, TODO_WIDTH);
  }
}
