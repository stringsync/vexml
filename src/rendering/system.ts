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
    // If there is no width, we should use the minimum required widths by returning null.
    if (!this.config.WIDTH) {
      return null;
    }

    // If there is only one measure, stretch it to the configured width.
    const measureCount = this.document.getMeasureCount(this.key);
    if (measureCount === 1) {
      return [this.config.WIDTH];
    }

    // Otherwise, we need to determine the minimum required widths of each measure by rendering it.
    const measureRenders = new Array<MeasureRender>();

    // Collect the absolute measure indexes to reflow as a single system. This will allow us to account for contextual
    // widths such as part labels (for first system and first measure) and stave connectors (for first measure entry in
    // any system).
    const absoluteMeasureIndexes = new Array<number>();
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const key: MeasureKey = { ...this.key, measureIndex };
      const absoluteMeasureIndex = this.document.getAbsoluteMeasureIndex(key);
      absoluteMeasureIndexes.push(absoluteMeasureIndex);
    }

    let document = this.document.reflow([{ measureIndexes: absoluteMeasureIndexes }]);
    if (this.key.systemIndex > 0) {
      document = document.withoutPartLabels();
    }

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      // In here, we're not going to use `this.document`. We're going to use the modified document that only has a
      // single system. We also need to update the key to reflect this.
      const key: MeasureKey = { systemIndex: 0, measureIndex };
      const measureRender = new Measure(this.config, this.log, document, key, Point.origin(), null).render();
      measureRenders.push(measureRender);
    }

    const totalMinRequiredSystemWidth = util.sum(measureRenders.map((measureRender) => measureRender.rect.w));
    const systemFraction = totalMinRequiredSystemWidth / this.config.WIDTH;
    if (this.document.isLastSystem(this.key) && systemFraction < this.config.LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD) {
      return measureRenders.map((measureRender) => measureRender.rect.w);
    }

    const measureWidths = new Array<number>();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      const minRequiredMeasureWidth = measureRenders[measureIndex].rect.w;
      const measureFraction = minRequiredMeasureWidth / totalMinRequiredSystemWidth;
      measureWidths.push(measureFraction * this.config.WIDTH);
    }

    return measureWidths;
  }
}
