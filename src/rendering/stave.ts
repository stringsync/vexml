import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Pen } from './pen';

const TODO_WIDTH = 400;
const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;

export type StaveRender = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  intrisicRect: Rect;
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

  getMinRequiredWidth(): number {
    return TODO_WIDTH;
  }

  render(): StaveRender {
    const pen = new Pen(this.position);

    const vexflowStave = this.renderVexflowStave(pen.clone());

    const rect = this.getVexflowStaveRectRepresentative(vexflowStave, pen);
    const intrisicRect = this.getIntrinsicRect(rect, vexflowStave);

    return {
      type: 'stave',
      key: this.key,
      rect,
      intrisicRect,
      vexflowStave,
    };
  }

  private renderVexflowStave(pen: Pen): vexflow.Stave {
    const isFirstSystem = this.key.systemIndex === 0;
    const isFirstMeasure = this.key.measureIndex === 0;
    const isLastMeasure = this.key.measureIndex === this.document.getMeasureCount(this.key) - 1;
    const isLastMeasureEntry = this.key.measureEntryIndex === this.document.getMeasureEntryCount(this.key) - 1;
    const isFirstPart = this.key.partIndex === 0;
    const isFirstStave = this.key.staveIndex === 0;

    let x = pen.x;
    // The first system measure has padding from the label.
    if (!isFirstSystem && isFirstMeasure) {
      x += MEASURE_NUMBER_PADDING_LEFT;
    }

    const y = pen.y;

    let width = this.width ?? this.getMinRequiredWidth();
    if (!isFirstSystem && isFirstMeasure) {
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
   * Returns a rect that _represents_ the vexflow stave's bounding box. We adjusted the vexflow stave's x and width
   * which is why we don't expect its bounding box to be representative of the rendering object.
   */
  private getVexflowStaveRectRepresentative(vexflowStave: vexflow.Stave, pen: Pen): Rect {
    const box = vexflowStave.getBoundingBox();

    const x = pen.x;
    const y = pen.y;
    const w = this.width ?? this.getMinRequiredWidth();
    const h = box.h;

    return new Rect(x, y, w, h);
  }

  /**
   * Returns the rect of the stave itself, ignoring any influence by child elements such as notes.
   */
  private getIntrinsicRect(vexflowStaveRectRepresentative: Rect, vexflowStave: vexflow.Stave): Rect {
    const topLineY = vexflowStave.getTopLineTopY();
    const bottomLineY = vexflowStave.getBottomLineBottomY();

    const x = vexflowStaveRectRepresentative.x;
    const y = topLineY;
    const w = vexflowStaveRectRepresentative.w;
    const h = bottomLineY - topLineY;

    return new Rect(x, y, w, h);
  }
}
