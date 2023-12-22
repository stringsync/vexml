import * as util from '@/util';
import { Address } from './address';
import { Config } from './config';
import { Measure, MeasureRendering } from './measure2';
import { Spanners } from './spanners';

/** The result of rendering a system. */
export type SystemRendering = {
  type: 'system';
  address: Address<'system'>;
  measures: MeasureRendering[];
};

/** The data needed to render a measure. */
export type MeasureData = {
  measure: Measure;
  width: number;
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width of the viewport or page.
 * Each system contains a segment of musical content from one or more parts, and multiple systems collectively render
 * the entirety of those parts.
 */
export class System {
  private config: Config;
  private index: number;
  private data: MeasureData[];

  constructor(opts: { config: Config; index: number; data: MeasureData[] }) {
    this.config = opts.config;
    this.index = opts.index;
    this.data = opts.data;
  }

  /** Returns the index of the system. */
  getIndex(): number {
    return this.index;
  }

  /** Renders the system. */
  render(opts: {
    x: number;
    y: number;
    address: Address<'system'>;
    previousSystem: System | null;
    nextSystem: System | null;
    spanners: Spanners;
  }): SystemRendering {
    const measureRenderings = new Array<MeasureRendering>();

    util.forEachTriple(this.data, ([previousData, currentData, nextData], { isFirst, isLast }) => {
      if (isFirst) {
        previousData = util.last(opts.previousSystem?.data ?? []);
      }
      if (isLast) {
        nextData = util.first(opts.nextSystem?.data ?? []);
      }

      const previousMeasure = previousData?.measure ?? null;
      const currentMeasure = currentData.measure;
      const nextMeasure = nextData?.measure ?? null;

      const width = currentData.width;

      const address = opts.address.measure({
        systemMeasureIndex: this.index,
        measureIndex: currentMeasure.getIndex(),
      });

      const measureRendering = currentData.measure.render({
        x: opts.x,
        y: opts.y,
        address,
        width,
        previousMeasure,
        nextMeasure,
        spanners: opts.spanners,
      });

      measureRenderings.push(measureRendering);
    });

    return {
      type: 'system',
      address: opts.address,
      measures: measureRenderings,
    };
  }
}
