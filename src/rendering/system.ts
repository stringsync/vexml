import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Measure, MeasureRender } from './measure';
import { MeasureKey, SystemKey } from './types';
import { Pen } from './pen';

export type SystemRender = {
  type: 'system';
  key: SystemKey;
  rect: Rect;
  measureRenders: MeasureRender[];
};

export class System {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: SystemKey,
    private position: Point
  ) {}

  render(): SystemRender {
    const pen = new Pen(this.position);

    const measureRenders = this.renderMeasures(pen);

    const rect = Rect.merge(measureRenders.map((measure) => measure.rect));

    return {
      type: 'system',
      key: this.key,
      rect,
      measureRenders,
    };
  }

  private renderMeasures(pen: Pen): MeasureRender[] {
    const measureRenders = new Array<MeasureRender>();
    const measureCount = this.document.getMeasures(this.key).length;
    const measureWidths = this.getMeasureWidths();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureKey: MeasureKey = { ...this.key, measureIndex };
      const width = measureWidths?.at(measureIndex) ?? null;
      const measure = new Measure(this.config, this.log, this.document, measureKey, pen.position(), width);
      const measureRender = measure.render();
      measureRenders.push(measureRender);
      pen.moveBy({ dx: measureRender.rect.w });
    }

    return measureRenders;
  }

  private getMeasureWidths(): number[] | null {
    if (!this.config.WIDTH) {
      return null; // use intrinsic widths
    }

    const measureCount = this.document.getMeasureCount(this.key);
    if (measureCount === 1) {
      return [this.config.WIDTH];
    }

    const minRequiredStaveWidths = new Array<number>();
    const minRequiredNonStaveWidths = new Array<number>();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const key: MeasureKey = { ...this.key, measureIndex };
      const measure = new Measure(this.config, this.log, this.document, key, Point.origin(), null);
      const [minRequiredStaveWidth, minRequiredNonStaveWidth] = measure.getMinRequiredWidths();
      minRequiredStaveWidths.push(minRequiredStaveWidth);
      minRequiredNonStaveWidths.push(minRequiredNonStaveWidth);
    }

    const totalMinRequiredStaveWidth = util.sum(minRequiredStaveWidths);
    const totalMinRequiredNonStaveWidth = util.sum(minRequiredNonStaveWidths);
    const totalMinRequiredSystemWidth = totalMinRequiredStaveWidth + totalMinRequiredNonStaveWidth;

    const measureWidths = new Array<number>();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const minRequiredStaveWidth = minRequiredStaveWidths[measureIndex];
      const minRequiredNonStaveWidth = minRequiredNonStaveWidths[measureIndex];
      const minRequiredMeasureWidth = minRequiredStaveWidth + minRequiredNonStaveWidth;

      const fraction = minRequiredMeasureWidth / totalMinRequiredSystemWidth;

      measureWidths.push(fraction * this.config.WIDTH);
    }

    return measureWidths;
  }
}
