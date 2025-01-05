import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey, MeasureKey, PartKey, StaveKey } from './types';
import { Point, Rect } from '@/spatial';
import { Fragment, FragmentRender } from './fragment';
import { Gap, GapRender } from './gap';
import { Pen } from './pen';

export type MeasureEntryRender = FragmentRender | GapRender;

export type MeasureRender = {
  type: 'measure';
  key: MeasureKey;
  rect: Rect;
  absoluteIndex: number;
  entryRenders: Array<MeasureEntryRender>;
  multiRestCount: number;
  vexflowMultiRest: vexflow.MultiMeasureRest | null;
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

    const absoluteIndex = this.document.getAbsoluteMeasureIndex(this.key);

    const multiRestCount = this.getMeasureMultiRestCount(this.key);
    if (multiRestCount > 0) {
      console.log('multiRestCount', multiRestCount);
      const width = 200;
      const vexflowStave = new vexflow.Stave(pen.x, pen.y, width);
      const height = vexflowStave.getHeight();
      const vexflowMultiRest = new vexflow.MultiMeasureRest(multiRestCount, {
        numberOfMeasures: 1,
      });
      vexflowMultiRest.setStave(vexflowStave);

      return {
        type: 'measure',
        key: this.key,
        rect: new Rect(pen.x, pen.y, width, height),
        multiRestCount,
        vexflowMultiRest,
        absoluteIndex,
        entryRenders: [
          {
            type: 'fragment',
            key: { ...this.key, measureEntryIndex: 0 },
            rect: new Rect(pen.x, pen.y, width, height),
            excessHeight: 0,
            partLabelGroupRender: null,
            vexflowStaveConnectors: [],
            partRenders: [
              {
                type: 'part',
                key: { ...this.key, measureEntryIndex: 0, partIndex: 0 },
                rect: new Rect(pen.x, pen.y, width, height),
                vexflowBrace: null,
                staveRenders: [
                  {
                    type: 'stave',
                    key: { ...this.key, measureEntryIndex: 0, partIndex: 0, staveIndex: 0 },
                    rect: new Rect(pen.x, pen.y, width, height),
                    vexflowStave: vexflowStave,
                    intrisicRect: new Rect(pen.x, pen.y, width, height),
                    voiceRenders: [],
                  },
                ],
              },
            ],
          },
        ],
      };
    }

    const entryRenders = this.renderMeasureEntries(pen);

    const rect = Rect.merge(entryRenders.map((entry) => entry.rect));

    return {
      type: 'measure',
      key: this.key,
      rect,
      entryRenders,
      multiRestCount: 0,
      absoluteIndex,
      vexflowMultiRest: null,
    };
  }

  /**
   * Returns the multi-rest count that applies to all elements in the measure.
   */
  private getMeasureMultiRestCount(key: MeasureKey): number {
    let measureMultiRestCount = -1;

    const measureEntryCount = this.document.getMeasureEntryCount(key);
    for (let measureEntryIndex = 0; measureEntryIndex < measureEntryCount; measureEntryIndex++) {
      const measureEntryKey: MeasureEntryKey = { ...key, measureEntryIndex };

      const partCount = this.document.getPartCount(measureEntryKey);
      for (let partIndex = 0; partIndex < partCount; partIndex++) {
        const partKey: PartKey = { ...measureEntryKey, partIndex };

        const staveCount = this.document.getStaveCount(partKey);
        for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
          const staveKey: StaveKey = { ...partKey, staveIndex };

          if (measureMultiRestCount === -1) {
            measureMultiRestCount = this.document.getStaveMultiRestCount(staveKey);
          } else {
            measureMultiRestCount = Math.min(measureMultiRestCount, this.document.getStaveMultiRestCount(staveKey));
          }
        }
      }
    }

    return Math.max(0, measureMultiRestCount);
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
