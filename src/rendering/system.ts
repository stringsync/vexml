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
      const measureRender = new Measure(
        this.config,
        this.log,
        this.document,
        measureKey,
        pen.position(),
        width
      ).render();
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

    const widths = this.document
      .getMeasures(this.key)
      .map<MeasureKey>((_, measureIndex) => ({ ...this.key, measureIndex }))
      .map((key) => new Measure(this.config, this.log, this.document, key, Point.origin(), null).render())
      .map((measureRender) => measureRender.rect.w);

    const total = util.sum(widths);

    return widths
      .map((width) => width / total)
      .map((fraction, measureIndex) => {
        const isLast = measureIndex === widths.length - 1;
        const isAboveStretchThreshold = fraction > this.config.LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD;
        if (isLast && isAboveStretchThreshold) {
          return widths[measureIndex];
        }
        return fraction * this.config.WIDTH!;
      });
  }
}
