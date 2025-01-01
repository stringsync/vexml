import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, MeasureKey } from './types';
import { Point, Rect } from '@/spatial';
import { Fragment, FragmentRender } from './fragment';
import { Gap, GapRender } from './gap';
import { Pen } from './pen';

export type MeasureRender = {
  type: 'measure';
  key: MeasureKey;
  rect: Rect;
  measureEntryRenders: Array<FragmentRender | GapRender>;
};

export class Measure {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private key: MeasureKey,
    private position: Point,
    private width: number | null
  ) {}

  getMinRequiredWidths(): [minRequiredStaveWidth: number, minRequiredNonStaveWidth: number] {
    const measureEntryCount = this.document.getMeasureEntryCount(this.key);

    let minRequiredStaveWidth = 0;
    let minRequiredNonStaveWidth = 0;

    for (let measureEntryIndex = 0; measureEntryIndex < measureEntryCount; measureEntryIndex++) {
      const key: MeasureEntryKey = { ...this.key, measureEntryIndex };
      const measureEntry = this.document.getMeasureEntry(key);

      // All measure entries in a measure must be the same width, so we pick the largest one.

      if (measureEntry.type === 'fragment') {
        const fragment = new Fragment(this.config, this.log, this.document, key, Point.origin(), null);
        const [staveWidth, nonStaveWidth] = fragment.getMinRequiredWidths();
        minRequiredStaveWidth = Math.max(minRequiredStaveWidth, staveWidth);
        minRequiredNonStaveWidth = Math.max(minRequiredNonStaveWidth, nonStaveWidth);
      }

      if (measureEntry.type === 'gap') {
        const gap = new Gap(this.config, this.log, this.document, key, Point.origin());
        const [staveWidth, nonStaveWidth] = gap.getMinRequiredWidths();
        minRequiredStaveWidth = Math.max(minRequiredStaveWidth, staveWidth);
        minRequiredNonStaveWidth = Math.max(minRequiredNonStaveWidth, nonStaveWidth);
      }
    }

    return [minRequiredStaveWidth, minRequiredNonStaveWidth];
  }

  render(): MeasureRender {
    const pen = new Pen(this.position);

    const measureEntryRenders = this.renderMeasureEntries(pen);

    const rect = Rect.merge(measureEntryRenders.map((entry) => entry.rect));

    return {
      type: 'measure',
      key: this.key,
      rect,
      measureEntryRenders,
    };
  }

  private renderMeasureEntries(pen: Pen): Array<FragmentRender | GapRender> {
    const measureEntryWidths = this.getMeasureEntryWidths();

    return this.document.getMeasureEntries(this.key).map((entry, measureEntryIndex) => {
      const key: MeasureEntryKey = { ...this.key, measureEntryIndex };
      const width = measureEntryWidths?.at(measureEntryIndex) ?? null;
      switch (entry.type) {
        case 'fragment':
          return new Fragment(this.config, this.log, this.document, key, pen.position(), width).render();
        case 'gap':
          return new Gap(this.config, this.log, this.document, key, pen.position()).render();
      }
    });
  }

  private getMeasureEntryWidths(): number[] | null {
    if (this.width === null) {
      return null;
    }

    const widths = this.document
      .getMeasureEntries(this.key)
      .map((measureEntry, measureEntryIndex) => {
        const key: MeasureEntryKey = { ...this.key, measureEntryIndex };
        switch (measureEntry.type) {
          case 'fragment':
            return new Fragment(this.config, this.log, this.document, key, Point.origin(), null).render();
          case 'gap':
            return new Gap(this.config, this.log, this.document, key, Point.origin()).render();
        }
      })
      .map((measureEntryRender) => measureEntryRender.rect.w);

    const total = util.sum(widths);

    return widths.map((w) => (w / total) * this.width!);
  }
}
