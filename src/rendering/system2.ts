import * as vexflow from 'vexflow';
import { Address } from './address';
import { Config } from './config';
import { Measure, MeasureRendering } from './measure2';
import { Spanners } from './spanners';

/** The result of rendering a system. */
export type SystemRendering = {
  type: 'system';
  address: Address<'system'>;
  measures: MeasureRendering[];
  vexflow: { staveConnector: vexflow.StaveConnector | null };
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

  /** Renders the system. */
  render(opts: {
    x: number;
    y: number;
    width: number;
    systemCount: number;
    previousSystem: System | null;
    nextSystem: System | null;
    spanners: Spanners;
  }): SystemRendering {
    const address = Address.system({ systemIndex: this.index, origin: 'System.prototype.render' });

    return {
      type: 'system',
      address,
      measures: [],
      vexflow: { staveConnector: null },
    };
  }
}
