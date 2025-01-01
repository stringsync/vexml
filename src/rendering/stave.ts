import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Pen } from './pen';
import { Ensemble } from './ensemble';

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
    private width: number | null,
    private ensemble: Ensemble
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
    const isFirstSystem = this.document.isFirstSystem(this.key);
    const isFirstMeasure = this.document.isFirstMeasure(this.key);
    const isLastMeasure = this.document.isLastMeasure(this.key);
    const isFirstMeasureEntry = this.document.isLastMeasureEntry(this.key);
    const isLastMeasureEntry = this.document.isLastMeasureEntry(this.key);
    const isFirstPart = this.document.isFirstPart(this.key);
    const isFirstStave = this.document.isFirstStave(this.key);

    const staveCount = this.document.getStaveCount(this.key);

    let x = pen.x;
    // The first system measure has padding from the label.
    if (!isFirstSystem && isFirstMeasure) {
      x += MEASURE_NUMBER_PADDING_LEFT;
    }

    const y = pen.y;

    let width = this.width ?? this.ensemble.getMinRequiredStaveWidth();
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
}
