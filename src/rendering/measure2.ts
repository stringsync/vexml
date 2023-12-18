import { Config } from './config';
import * as musicxml from '@/musicxml';

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
  private musicXml: {
    measure: musicxml.Measure;
    staveLayouts: musicxml.StaveLayout[];
  };

  constructor(opts: {
    config: Config;
    index: number;
    musicXml: {
      measure: musicxml.Measure;
      staveLayouts: musicxml.StaveLayout[];
    };
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
  }

  /** Renders the measure. */
  render(): MeasureRendering {
    return {
      type: 'measure',
    };
  }
}
