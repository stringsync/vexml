import { Config } from './config';
import { MeasureEntry, StaveSignature } from './stavesignature';
import * as musicxml from '@/musicxml';
import { PartScoped } from './types';

/** The result of rendering a measure fragment. */
export type MeasureFragmentRendering = {
  type: 'measurefragment';
};

/**
 * Represents a fragment of a measure.
 *
 * A measure fragment is necessary when stave modifiers change. It is not a formal musical concept, and it is moreso an
 * outcome of vexflow's Stave implementation.
 *
 * Measure fragments format all measure parts against the first stave.
 */
export class MeasureFragment {
  private config: Config;
  private index: number;
  private musicXml: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyle: PartScoped<musicxml.BarStyle>;
    endBarStyle: PartScoped<musicxml.BarStyle>;
  };
  private measureEntries: PartScoped<MeasureEntry>[];
  private staveSignatures: PartScoped<StaveSignature>[];
  private staveCounts: PartScoped<number>[];

  constructor(opts: {
    config: Config;
    index: number;
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: PartScoped<musicxml.BarStyle>;
      endBarStyle: PartScoped<musicxml.BarStyle>;
    };
    measureEntries: PartScoped<MeasureEntry>[];
    staveSignatures: PartScoped<StaveSignature>[];
    staveCounts: PartScoped<number>[];
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignatures = opts.staveSignatures;
    this.staveCounts = opts.staveCounts;
  }
}
