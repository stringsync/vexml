import { Config } from './config';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { PartMap } from './types';
import * as musicxml from '@/musicxml';

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
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private measureEntries: PartMap<MeasureEntry[]>;
  private staveSignatures: PartMap<StaveSignature>;
  private staveCounts: PartMap<number>;

  constructor(opts: {
    config: Config;
    index: number;
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: PartMap<MeasureEntry[]>;
    staveSignatures: PartMap<StaveSignature>;
    staveCounts: PartMap<number>;
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignatures = opts.staveSignatures;
    this.staveCounts = opts.staveCounts;
  }
}
