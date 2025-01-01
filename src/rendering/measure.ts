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
