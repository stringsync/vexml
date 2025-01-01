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

  render(): StaveRender {
    const pen = new Pen(this.position);

    const vexflowStave = this.renderVexflowStave(pen.clone());
    const rect = Rect.fromRectLike(vexflowStave.getBoundingBox());
    const intrisicRect = this.getIntrinsicRect(vexflowStave);

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
    const isFirstMeasureEntry = this.key.measureEntryIndex === 0;
    const isLastMeasureEntry = this.key.measureEntryIndex === this.document.getMeasureEntryCount(this.key) - 1;
    const isFirstPart = this.key.partIndex === 0;
    const isFirstStave = this.key.staveIndex === 0;
    const staveCount = this.document.getStaveCount(this.key);

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

    // If there's more than 1 stave in a part, the stave connector will serve as the barline.
    if (isFirstMeasureEntry && staveCount === 1) {
      vexflowStave.setBegBarType(vexflow.Barline.type.SINGLE);
    } else {
      vexflowStave.setBegBarType(vexflow.Barline.type.NONE);
    }

    if (isLastMeasure && isLastMeasureEntry && staveCount === 1) {
      vexflowStave.setEndBarType(vexflow.Barline.type.SINGLE);
    } else {
      vexflowStave.setEndBarType(vexflow.Barline.type.NONE);
    }

    if (isFirstPart && isFirstStave) {
      vexflowStave.setMeasure(this.document.getMeasure(this.key).label);
    }

    return vexflowStave;
  }

  /**
   * Returns the rect of the stave itself, ignoring any influence by child elements such as notes.
   */
  private getIntrinsicRect(vexflowStave: vexflow.Stave): Rect {
    const box = vexflowStave.getBoundingBox();
    const topLineY = vexflowStave.getTopLineTopY();
    const bottomLineY = vexflowStave.getBottomLineBottomY();

    const x = box.x;
    const y = topLineY;
    const w = box.w;
    const h = bottomLineY - topLineY;

    return new Rect(x, y, w, h);
  }

  /** Returns the minimum width needed to render this stave based on its voice group. */
  private getMinRequiredWidth(): number {
    return TODO_WIDTH;
  }
}
