import { Config } from './config';
import * as musicxml from '@/musicxml';
import { PartMap } from './types';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private index: number;
  private partIds: string[];
  private musicXml: {
    measure: PartMap<musicxml.Measure>;
    staveLayouts: musicxml.StaveLayout[];
  };

  constructor(opts: {
    config: Config;
    index: number;
    partIds: string[];
    musicXml: {
      measure: PartMap<musicxml.Measure>;
      staveLayouts: musicxml.StaveLayout[];
    };
  }) {
    this.config = opts.config;
    this.partIds = opts.partIds;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(opts: { previousMeasure: Measure | null }): number {
    return 0;
  }

  /** Renders the measure. */
  render(): MeasureRendering {
    return {
      type: 'measure',
    };
  }
}
