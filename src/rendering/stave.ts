import * as vexflow from 'vexflow';
import { Point, Rect } from '@/spatial';
import { StaveKey } from './types';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Pen } from './pen';
import { Ensemble } from './ensemble';
import { Voice, VoiceRender } from './voice';

const MEASURE_NUMBER_PADDING_LEFT = 6;
const BARLINE_WIDTH = 1;

export type StaveRender = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  intrisicRect: Rect;
  vexflowStave: vexflow.Stave;
  voiceRenders: VoiceRender[];
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

    const voiceRenders = this.renderVoices(vexflowStave);

    const rect = Rect.fromRectLike(vexflowStave.getBoundingBox());
    const intrisicRect = this.getIntrinsicRect(vexflowStave);

    return {
      type: 'stave',
      key: this.key,
      rect,
      intrisicRect,
      vexflowStave,
      voiceRenders,
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

    let width = this.width ?? this.ensemble.getStaveWidth();
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

  private renderVoices(vexflowStave: vexflow.Stave): VoiceRender[] {
    const voiceRenders = new Array<VoiceRender>();
    const voiceCount = this.document.getVoiceCount(this.key);

    for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
      const key = { ...this.key, voiceIndex };
      const voiceRender = new Voice(this.config, this.log, this.document, key, this.ensemble).render();
      voiceRenders.push(voiceRender);
    }

    let validVexflowVoiceCount = 0;

    for (const voiceRender of voiceRenders) {
      const vexflowVoice = voiceRender.vexflowVoice;
      if (vexflowVoice.getTickables().length === 0) {
        this.log.warn('encountered voice without tickables', { key: voiceRender.key });
        continue;
      }
      vexflowVoice.setStave(vexflowStave);
      validVexflowVoiceCount++;
    }

    if (validVexflowVoiceCount === 0) {
      this.log.warn('encountered stave without valid vexflow voices', { key: this.key });
      return [];
    }

    return voiceRenders;
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
