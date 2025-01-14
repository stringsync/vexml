import * as util from '@/util';
import { Point, Rect } from '@/spatial';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';
import { MeasureKey, MeasureRender, SystemKey, SystemRender } from './types';
import { Pen } from './pen';

export class System {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: SystemKey,
    private width: number | null,
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

    let multiRestCount = 0;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const measureKey: MeasureKey = { ...this.key, measureIndex };
      const width = measureWidths?.at(measureIndex) || null;

      if (multiRestCount === 0) {
        const measure = new Measure(this.config, this.log, this.document, measureKey, pen.position(), width);
        const measureRender = measure.render();
        measureRenders.push(measureRender);
        multiRestCount = Math.max(0, measureRender.multiRestCount - 1);
        pen.moveBy({ dx: measureRender.rect.w });
      } else {
        multiRestCount--;
      }
    }

    return measureRenders;
  }

  private getMeasureWidths(): number[] | null {
    // If there is no width, we should use the minimum required widths by returning null.
    if (!this.width) {
      return null;
    }

    // If there is only one measure, stretch it to the configured width.
    const isLastSystem = this.document.isLastSystem(this.key);
    const measureCount = this.document.getMeasureCount(this.key);
    if (!isLastSystem && measureCount === 1) {
      return [this.width];
    }

    // Otherwise, we need to determine the minimum required widths of each measure by rendering it.
    const minRequiredMeasureWidths = new Array<number>();

    // Collect the absolute measure indexes to reflow as a single system. This will allow us to account for contextual
    // widths such as part labels (for first system and first measure) and stave connectors (for first measure entry in
    // any system).
    let document = this.document;

    if (measureCount > 0) {
      const from = this.document.getAbsoluteMeasureIndex({ ...this.key, measureIndex: 0 });
      const to = this.document.getAbsoluteMeasureIndex({ ...this.key, measureIndex: measureCount - 1 });
      document = this.document.reflow([{ from, to }]);
      if (this.key.systemIndex > 0) {
        document = document.withoutPartLabels();
      }
    }

    let multiRestCount = 0;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      // In here, we're not going to use `this.document`. We're going to use the modified document that only has a
      // single system. We also need to update the key to reflect this.
      const key: MeasureKey = { systemIndex: 0, measureIndex };

      if (multiRestCount === 0) {
        const measureRender = new Measure(this.config, this.log, document, key, Point.origin(), null).render();
        minRequiredMeasureWidths.push(measureRender.rect.w);
        multiRestCount = Math.max(0, measureRender.multiRestCount - 1);
      } else {
        minRequiredMeasureWidths.push(0);
        multiRestCount--;
      }
    }

    const totalMinRequiredSystemWidth = util.sum(minRequiredMeasureWidths);
    const systemFraction = totalMinRequiredSystemWidth / this.width;
    if (this.document.isLastSystem(this.key) && systemFraction < this.config.LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD) {
      return minRequiredMeasureWidths;
    }

    const measureWidths = new Array<number>();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const minRequiredMeasureWidth = minRequiredMeasureWidths.at(measureIndex) ?? 0;
      const measureFraction = minRequiredMeasureWidth / totalMinRequiredSystemWidth;
      measureWidths.push(measureFraction * this.width);
    }

    return measureWidths;
  }
}
