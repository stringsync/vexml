import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartScoped } from './types';
import { Address } from './address';
import { MeasureFragment } from './measurefragment2';
import { MeasureEntry, StaveSignature } from './stavesignature';

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
    measures: PartScoped<musicxml.Measure>[];
    staveLayouts: musicxml.StaveLayout[];
  };
  private leadingStaveSignatures: PartScoped<StaveSignature>[];
  private entries: PartScoped<MeasureEntry>[];

  constructor(opts: {
    config: Config;
    index: number;
    partIds: string[];
    musicXml: {
      measures: PartScoped<musicxml.Measure>[];
      staveLayouts: musicxml.StaveLayout[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
  }) {
    this.config = opts.config;
    this.partIds = opts.partIds;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
  }

  /** Returns the absolute index of the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(opts: { address: Address<'measure'>; previousMeasure: Measure | null }): number {
    return 0;
  }

  /** Renders the measure. */
  render(): MeasureRendering {
    return {
      type: 'measure',
    };
  }

  @util.memoize()
  private getFragments(): MeasureFragment[] {
    const fragments = new Array<MeasureFragment>();

    return fragments;
  }

  private getBeginningBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'left')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }

  private getEndBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'right')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }
}
